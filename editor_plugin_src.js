/**
 * $Id: editor_plugin_src.js 2010-01-05
 *
 * @author Mike Firesheets
 * https://github.com/mikefiresheets/tinymce-url-shortener
 *
 * Detect very long URLs or words as they are typed in. Insert placeholder text
 * and offer to create a shorter link for the user.
 */

(function() {
    // Load plugin specific language pack
    tinymce.PluginManager.requireLangPack('urlshortener');

    function trim(str) {
        return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    }

    tinymce.create('tinymce.plugins.URLShortener', {
        recurse : false,
        node : '',
        id : '',
        doParse : false,
        doSub : false,
        bookmark : null,

        /**
         * Initializes the plugin, this will be executed after the plugin has been created.
         * This call is done before the editor instance has finished its initialization so use the onInit event
         * of the editor instance to intercept that event.
         *
         * @param {tinymce.Editor} ed Editor instance that the plugin is initialized in.
         * @param {string} url Absolute URL to where the plugin is located.
         */
        init : function(ed, url) {
            var self = this;
            // Settings parameters from user config
            self.doUrls    = ed.getParam('urlshortener_doUrls', true);
            self.doWords   = ed.getParam('urlshortener_doWords', true);
            self.maxLength = ed.getParam('urlshortener_maxLength', 30);
            self.urlRegex  = ed.getParam('urlshortener_urlRegex', /^((https?|ftp|news):\/\/)?(?:[a-z](?:[a-z0-9\-]*\.)+(?:[a-z]{2}|aero|arpa|biz|com|coop|edu|gov|info|int|jobs|mil|museum|name|nato|net|org|pro|travel)|(?:(?:[0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}(?:[0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))(?:\/[a-z0-9_\-\.~]+)*(?:\/([a-z0-9_\-\.]*)(?:\?[a-z0-9+_\-\.%:=&\/!;]*)?)?(?:#[a-z][a-z0-9_]*)?$/i);

            // Open the dialog window to shorten URLs
            ed.addCommand('mceURLShortener', function() {
                ed.windowManager.open({
                    file : url + '/urlshortener.htm',
                    width : 700 + parseInt(ed.getLang('urlshortener.delta_width', 0)),
                    height : 215 + parseInt(ed.getLang('urlshortener.delta_height', 0)),
                    inline : true
                }, {
                    plugin_url : url,
                    sender : self
                });
            });

            // Open the dialog window to automatically shorten long words
            // ed.addCommand('mceWordShortener', function() {
            //     ed.windowManager.open({
            //             file : url + '/wordshortener.htm',
            //             width : 700 + parseInt(ed.getLang('urlshortener.delta_width', 0)),
            //             height : 260 + parseInt(ed.getLang('urlshortener.delta_height', 0)),
            //             inline : true
            //         }, {
            //             plugin_url : url,
            //             sender: self
            //         });
            // });

            ed.onChange.add(function(ed, l) {
                // If the editor content has changed, parse it looking for any
                // new URLs or long words that need to be processed
                if (ed.isDirty()) {
                    var t = self, sub = new Array();
                    var c = ed.getContent({format:'text'});
                    console.log('C is ');
                    console.log(c);
                    console.log('L is ');
                    console.log(l.content);
                    if (t.doSub) {
                        c = c.replace(/<img[^>]+\/>/g, function(im) {
                            if (im.indexOf('class="wordshortener_new') !== -1 || im.indexOf('class="urlshortener_new') !== -1) {
                                sub[sub.length] = t.getAttr(im, 'title');
                                sub[sub.length] = t.getAttr(im, 'longdesc');
                                return '';
                            }
                            return im;
                        });

                        for (var i=0; i<sub.length; i++) {
                            c = c.replace(/<([^\s]+)\b ([^>]*id=[^>]*)>[^<]*<\/\1>/g, function(all, tag, attr) {
                                var tmp = t.getAttr(attr, 'id');
                                if (tmp == sub[i]) {
                                    all = '<'+tag+' '+attr+'>'+sub[++i]+'</'+tag+'>';
                                }
                                return all;
                            });
                        }
                        ed.setContent(c, {format:'raw'});
                        t.doSub = false;
                    }
                    if (!t.recurse && (t.doParse || t.chkTxtLen(c))) {
                        this.doParse = false;
                        var r = ed.dom.getRoot();
                        tinymce.each(r.children, function(n) {
                            if (t.chkTxtLen(n.textContent))
                                t.parse(n);
                        });
                    }
                }
            });
        },

        getAttr : function(s, n) {
            var ed = tinyMCE.activeEditor;
            n = new RegExp(n + '=\"([^\"]+)\"', 'g').exec(s);

            return n ? ed.dom.decode(n[1]) : '';
        },

        chkTxtLen : function (txt) {
            if (txt.length < this.maxLength) {
                return null;
            }
            txt = txt.replace(/<.[^<>]*?>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ');
            var m = txt.split(' ');
            var f = false;
            for (var i=0; m && !f && i<m.length; i++) {
                f = trim(m[i]).length >= this.maxLength;
            }
            return f;
        },

        parse : function (node) {
            var ed = tinyMCE.activeEditor;
            if (this.doParse)
                return false;
            this.recurse = true;

            if (node.nodeType == 3) {
                if (node.data.length < this.maxLength) {
                    return false;
                }
                var a = ed.dom.getParent(node, 'a');
                if (a) {
                    ed.selection.select(a);
                    this.bookmark = ed.selection.getBookmark();
                    var id = this.getAttr(a, 'id');
                    if (!id) {
                        id = ed.dom.uniqueId('shorten_');
                        this.id = id;
                        ed.dom.setAttrib(a, 'id', id);
                    }
                    this.node = a;
                    ed.execCommand('mceURLShortener', true);
                    return false;
                }
                // Split node on word boundaries to check for URL
                var k = node.data.split(' ');
                var ret = false;
                for (var i=0; i<k.length; i++) {
                    var idx = -1;
                    var tmp = trim(k[i]);
                    var u = this.urlRegex.test(tmp);
                    var x = this.maxLength <= tmp.length;
                    if (u || x) {
                        this.id = ed.dom.uniqueId('shorten_');
                        ret = true;
                        idx = node.data.indexOf(tmp);
                        var l = node;
                        var r = l.splitText(tmp.length+idx);
                        var m = l.splitText(idx);
                        if (u) {
                            var d = x ? 'Click here' : m.data;
                            var h = (tmp.indexOf('http')==0 ? '' : 'http://')+tmp;
                            var t = ed.dom.create('a', {id:this.id, href:h}, d);
                            this.node = m.parentNode.insertBefore(t, r);
                            ed.dom.remove(m);
                            this.node.parentNode.normalize();
                            r.length ? ed.selection.select(r) : ed.selection.select(this.node);
                            ed.selection.collapse();
                            this.bookmark = ed.selection.getBookmark();
                            if (x) {
                                this.doParse = true;
                                ed.execCommand('mceURLShortener', true);
                                break;
                            }
                        } else {
                            var s = ed.dom.create('span', {id:this.id,title:m.data}, m.data.substr(0,30)+'...');
                            this.node = m.parentNode.insertBefore(s, r);
                            ed.dom.remove(m);
                            this.node.parentNode.normalize();
                            r.length ? ed.selection.select(r) : ed.selection.select(this.node);
                            ed.selection.collapse();
                            this.bookmark = ed.selection.getBookmark();
                            this.doParse = true;
                            ed.execCommand('mceWordShortener', true);
                            break;
                        }
                    }
                }
                return ret;
            } else if (node.nodeType == 1) {
                if (node.childNodes.length) {
                    for (var j=0; j<node.childNodes.length; j++) {
                        if (this.doParse)
                            break;
                        this.parse(node.childNodes[j]);
                    }
                }
            }
            this.recurse = false;
            return false;
        },

        /**
         * Returns information about the plugin as a name/value array.
         * The current keys are longname, author, authorurl, infourl and version.
         *
         * @return {Object} Name/value array containing information about the plugin.
         */
        getInfo : function() {
            return {
                longname : 'URL Shortener',
                author : 'Mike Firesheets',
                authorurl : 'https://github.com/mikefiresheets',
                infourl : 'https://github.com/mikefiresheets/tinymce-url-shortener',
                version : '0.1'
            };
        }

    });

    // Register plugin
    tinymce.PluginManager.add('urlshortener', tinymce.plugins.URLShortener);
})();
