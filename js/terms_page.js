"use strict";
var terms_page={
    keys:{
        focused_part:"menu_selection", // or, "search part", "slider part", "sub menu part", "search_value"
        menu_selection:0 // the index of selected menu,
    },
    menu_doms:$('.terms-modal-button'),
    prev_route:'',
    movie:null,
    init:function(prev_route){
        this.prev_route=prev_route;
        current_route='terms-page';
        this.hoverMenuItem(0);
        $('#terms-modal').modal('show');
    },
    goBack:function(){
        if(settings.terms_accepted==0){
            if(platform==='samsung'){
                tizen.application.getCurrentApplication().exit();
            }else
                window.close();
            return;
        }
        $('#terms-modal').modal('hide');
        current_route=this.prev_route;
    },
    movePrivacyScrollbar:function (increment){
        $('.privacy-modal-content').animate({ scrollTop: '+='+50*increment}, 10);
    },
    hoverMenuItem:function(index){
        var keys=this.keys;
        keys.focused_part="menu_selection";
        keys.menu_selection=index;
        $(this.menu_doms).removeClass('active');
        $(this.menu_doms[index]).addClass('active');
    },
    handleMenuClick:function(){
        var keys=this.keys;
        if(keys.focused_part==="menu_selection"){  // if sub menu is not opened yet
            var keys=this.keys;
            switch (keys.menu_selection) {
                case 0:
                    this.goBack();
                    break;
                case 1:
                    settings.saveSettings('terms_accepted',1,'')
                    this.goBack();
                    break;
            }

        }
    },
    handleMenusUpDown:function(increment) {
        this.movePrivacyScrollbar(increment);
    },
    handleMenuLeftRight:function(increment) {
        var keys=this.keys;
        if(keys.focused_part==="menu_selection"){  // if submenu not opened yet
            keys.menu_selection+=increment;
            if(keys.menu_selection<0)
                keys.menu_selection=0;
            if(keys.menu_selection>1)
                keys.menu_selection=1;
            this.hoverMenuItem(keys.menu_selection);
        }
    },
    HandleKey:function(e){
        switch (e.keyCode) {
            case tvKey.RIGHT:
                this.handleMenuLeftRight(1);
                break;
            case tvKey.LEFT:
                this.handleMenuLeftRight(-1);
                break;
            case tvKey.DOWN:
                this.handleMenusUpDown(1)
                break;
            case tvKey.UP:
                this.handleMenusUpDown(-1)
                break;
            case tvKey.ENTER:
                this.handleMenuClick();
                break;
            case tvKey.RETURN:
                this.goBack();
                break;
        }
    }
}
