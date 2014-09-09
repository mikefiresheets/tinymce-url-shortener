/**
 * $Id: editor_plugin_src.js 2010-01-05
 *
 * @author Crossroads/Mike Firesheets
 * http://www.crossroads.net
 *
 * Detect emails and urls as they are typed in Mozilla/Safari/Chrome and Opera
 * Borrowed from both Typo3 http://typo3.org/ and Xinha http://xinha.gogo.co.nz/
 * Heavily modified and cleaned up.
 *
 * Original license info from Xinha at the bottom.
 *
 * Borrowed from LinkAutoDetect by Shane Tomlinson and combined with Link plugin
 * from the Advanced theme.
 */

(function() {
	tinymce.create('tinymce.plugins.URLShortener', {
        url : null,
        len : 30,
        urlregex : null,
        recurse : false,
        node : '',
        id : '',
        doParse : false,
        doSub : false,
        bookmark : null,

		init : function(ed, url) {
			var t = this;
            t.url = url;
            t.len = ed.getParam('urlshortener_maxlength', 30);
            t.urlregex = /^((https?|ftp|news):\/\/)?(?:[a-z](?:[a-z0-9\-]*\.)+(?:[a-z]{2}|aero|arpa|biz|com|coop|edu|gov|info|int|jobs|mil|museum|name|nato|net|org|pro|travel)|(?:(?:[0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}(?:[0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))(?:\/[a-z0-9_\-\.~]+)*(?:\/([a-z0-9_\-\.]*)(?:\?[a-z0-9+_\-\.%:=&\/!;]*)?)?(?:#[a-z][a-z0-9_]*)?$/i;

            ed.onChange.add(t.onChange, t);

            ed.addCommand('mceURLShortener', function() {
                ed.windowManager.open({
                    url : url + '/urlshortener.htm',
                    width : 325 + parseInt(ed.getLang('urlshortener.link_delta_width', 0)),
                    height : 215 + parseInt(ed.getLang('urlshortener.link_delta_height', 0)),
                    inline : true
                }, {
                    node : t.node,
                    target : t.id,
                    mark : t.bookmark,
                    ref : t
                });
            });

            ed.addCommand('mceWordShortener', function() {
                ed.windowManager.open({
                        url : url + '/wordshortener.htm',
                        width : 325 + parseInt(ed.getLang('urlshortener.link_delta_width', 0)),
                        height : 260 + parseInt(ed.getLang('urlshortener.link_delta_height', 0)),
                        inline : true
                    }, {
                        node : t.node,
                        target : t.id,
                        mark : t.bookmark,
                        ref : t
                    });
            });
		},

		getInfo : function() {
			return {
				longname : 'URL Shortener',
				author : 'Crossroads/Mike Firesheets',
				authorurl : 'http://www.crossroads.net',
				infourl : 'http://www.crossroads.net',
				version : '0.1'
			};
		},

        onChange : function (ed, l) {
            if (ed.isDirty()) {
                var t = this, sub = new Array();
                var c = ed.getContent({format:'text'});
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
        },

        getAttr : function(s, n) {
            var ed = tinyMCE.activeEditor;
            n = new RegExp(n + '=\"([^\"]+)\"', 'g').exec(s);

            return n ? ed.dom.decode(n[1]) : '';
        },

        trim : function(str) {
            return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
        },

        chkTxtLen : function (txt) {
            if (txt.length < this.len) {
                return null;
            }
            txt = txt.replace(/<.[^<>]*?>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ');
            var m = txt.split(' ');
            var f = false;
            for (var i=0; m && !f && i<m.length; i++) {
                f = this.trim(m[i]).length >= this.len;
            }
            return f;
        },

        parse : function (node) {
            var ed = tinyMCE.activeEditor;
            if (this.doParse)
                return false;
            this.recurse = true;

            if (node.nodeType == 3) {
                if (node.data.length < this.len) {
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
                    var tmp = this.trim(k[i]);
                    var u = this.urlregex.test(tmp);
                    var x = this.len <= tmp.length;
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
        }

	});

	// Register plugin
	tinymce.PluginManager.add('urlshortener', tinymce.plugins.URLShortener);
})();

/*
htmlArea License (based on BSD license)
Copyright (c) 2002-2004, interactivetools.com, inc.
Copyright (c) 2003-2004 dynarch.com
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1) Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.

2) Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3) Neither the name of interactivetools.com, inc. nor the names of its
   contributors may be used to endorse or promote products derived from this
   software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
*/
