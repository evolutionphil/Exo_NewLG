"use strict";
var activation_page={
    keys:{
        focused_part:'input_selection', // grid_part
        input_selection:0,
        btn_selection:0
    },
    prev_route:'',
    buttons:$('.activation-btn'),
    activation_input:$('#activation-input')[0],
    is_loading:false,
    tried_panel_indexes:[],
    init:function(prev_route){
        this.prev_route=prev_route;
        $('#activation-modal').modal('show');
        $(this.activation_input).val('');
        current_route='activation-page';
        this.hoverInput();
        this.tried_panel_indexes=[];
        $('#activation-code-message').hide();
    },
    goBack:function(){
        $('#activation-modal').modal('hide');
        current_route=this.prev_route;
        if(this.prev_route==='playlist-page'){
            if(is_trial==2){
                playlist_page.hoverPlayListItem(playlist_page.keys.playlist_selection);
                $(playlist_page.activation_btn).hide();
            }
        }else if(this.prev_route==='login'){
            if(is_trial==2){
                login_page.login();
            }
        }
    },
    showErrorMessage:function(message){
        $('#activation-code-message').text(message).slideDown();
        setTimeout(function () {
            $('#activation-code-message').slideUp();
        },4000)
    },
    confirmActivationCode:function(){
        $('#activation-code-message').hide();
        var activation_code=$(this.activation_input).val();
        if(!activation_code){
            this.showErrorMessage('Sorry, activation code is required');
            return;
        }
        this.is_loading=true;
        showLoader(true);
        var that=this;
        var temps=pickPanelUrl(this.tried_panel_indexes);
        var url=temps[1],url_index=temps[0];
        var data={
            mac_address:mac_address,
            code:activation_code
        }
        var encrypted_data=encryptRequest(data);
        $.ajax({
            method: 'post',
            url: url + "/check-activation-code",
            data: {
                data: encrypted_data
            },
            success: function (data1) {
                if(that.is_loading){
                    that.is_loading=false;
                    showLoader(false);
                    var data = decryptResponse(data1);
                    if(data.status==='success'){
                        expire_date=data.expire_date;
                        $('.expire-date').text(expire_date);
                        saveData('is_trial',2);
                        var api_data=localStorage.getItem(storage_id+'api_data');
                        api_data=JSON.parse(api_data);
                        api_data.is_trial=2;
                        api_data.expire_date=data.expire_date;
                        localStorage.setItem(storage_id+'api_data',JSON.stringify(api_data));
                        that.goBack();
                    }else{
                        that.showErrorMessage(data.msg);
                    }
                }
            },
            error: function () {
                if(that.tried_panel_indexes.length<panel_urls.length){
                    that.tried_panel_indexes.push(url_index);
                    that.fetchPlaylistInformation();
                }else{
                    that.is_loading=false;
                    showLoader(false);
                    that.showErrorMessage('Sorry, Code is not valid');
                }
            }
        });
    },
    hoverInput:function(){
        $(this.buttons).removeClass('active');
        $(this.activation_input).addClass('active');
        this.keys.focused_part='input_selection';
    },
    hoverBtn:function(index){
        var keys=this.keys;
        keys.btn_selection=index;
        keys.focused_part='btn_selection';
        $(this.activation_input).removeClass('active');
        $(this.buttons).removeClass('active');
        $(this.buttons[index]).addClass('active');
    },
    handleMenuLeftRight:function(increment){
        var keys=this.keys;
        switch (keys.focused_part) {
            case 'btn_selection':
                keys.btn_selection=increment>0 ? 1 : 0;
                this.hoverBtn(keys.btn_selection);
        }
    },
    handleMenuUpDown:function(increment){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "input_selection":
                if(increment>0){
                    $(this.activation_input).blur();
                    this.hoverBtn(keys.btn_selection);
                }
                break;
            case "btn_selection":
                if(increment<0)
                    this.hoverInput();
                break;
        }
    },
    handleMenuClick:function(){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "input_selection":
                $(this.activation_input).focus();
                setSelectionRange(this.activation_input);
                break;
            case "btn_selection":
                if(keys.btn_selection==0){
                    this.confirmActivationCode();
                }else
                    this.goBack();
        }
    },
    HandleKey:function(e){
        if(this.is_loading){
            if(e.keyCode===tvKey.RETURN){
                showLoader(false);
                this.is_loading=false;
                this.goBack();
            }
            return;
        }
        switch(e.keyCode){
            case tvKey.LEFT:
                this.handleMenuLeftRight(-1);
                break;
            case tvKey.RIGHT:
                this.handleMenuLeftRight(1);
                break;
            case tvKey.UP:
                this.handleMenuUpDown(-1);
                break;
            case tvKey.DOWN:
                this.handleMenuUpDown(1);
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