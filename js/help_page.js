"use strict";
var help_page={
    keys:{
        focused_part:"menu_selection", // or, "search part", "slider part", "sub menu part", "search_value"
        menu_selection:0 // the index of selected menu,
    },
    prev_route:'',
    init:function(prev_route){
        this.prev_route=prev_route;
        current_route='help-page';
        $('#help-modal').modal('show');
    },
    goBack:function(){
        $('#help-modal').modal('hide');
        current_route=this.prev_route;
    },
    handleMenuClick:function(){

    },
    handleMenusUpDown:function(increment) {

    },
    handleMenuLeftRight:function(increment) {

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
