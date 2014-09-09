var WordShortenerDialog = {
    init : function() {
        tinyMCEPopup.resizeToInnerSize();
        var n = tinyMCEPopup.getWindowArg('node');
        var d = document.getElementById('display');
        d.value = n.textContent;
        d.select();
    },

    update : function() {
        tinyMCEPopup.execCommand("mceBeginUndoLevel");
        var f = document.forms[0];
        var text = f.display.value;
        var ed = tinyMCE.activeEditor;
        var b = tinyMCEPopup.getWindowArg('mark');
        var target = tinyMCEPopup.getWindowArg('target');
        var node = tinyMCEPopup.getWindowArg('node');
        var img = ed.dom.create('img', {'title':target, 'longdesc':text, 'class':'wordshortener_new mceItem'});
        ed.dom.insertAfter(img, node.id);
        var ref = tinyMCEPopup.getWindowArg('ref');
        ref.doSub = true;
        ref.doParse = false;
        tinyMCEPopup.execCommand("mceEndUndoLevel");
        ed.selection.moveToBookmark(b);
        ed.focus();
        ed.onChange.dispatch(ed);
        tinyMCEPopup.close();
    }
};

tinyMCEPopup.requireLangPack();
tinyMCEPopup.onInit.add(WordShortenerDialog.init, WordShortenerDialog);
