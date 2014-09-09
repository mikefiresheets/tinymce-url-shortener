var URLShortenerDialog = {
    init : function() {
        tinyMCEPopup.resizeToInnerSize();

        // Fill in dialog box URL with the original link
        var sender = tinyMCEPopup.getWindowArg('sender');
        document.getElementById('href').value = sender.node.href;
        var display = document.getElementById('display');
        display.value = sender.node.text;
        display.select();
    },

    update : function() {
        tinyMCEPopup.execCommand("mceBeginUndoLevel");
        var f      = document.forms[0],
            text   = f.display.value,
            ed     = tinyMCE.activeEditor,
            sender = tinyMCEPopup.getWindowArg('sender');
console.log(tinyMCEPopup.getWindowArg('plugin_url'));
        var img = ed.dom.create('img', {'title': sender.id, 'longdesc':text, 'class':'urlshortener_new mceItem', src:''});
        ed.dom.insertAfter(img, sender.node.id);
        sender.doSub = true;
        sender.doParse = false;
        tinyMCEPopup.execCommand("mceEndUndoLevel");
        ed.selection.moveToBookmark(sender.bookmark);
        ed.focus();
        tinyMCEPopup.close();
    }
};

tinyMCEPopup.requireLangPack();
tinyMCEPopup.onInit.add(URLShortenerDialog.init, URLShortenerDialog);
