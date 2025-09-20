"use strict";

$(document).ready(function () {
    try{
        if(window.navigator.userAgent.toLowerCase().includes('web0s'))
            platform='lg'
    }catch (e) {
    }
    
    // FORCE LG MODE FOR TESTING AUDIO TRACKS
    platform='lg';
    $('#app').addClass(platform);

    initKeys();
    initPlayer();
    settings.initFromLocal();
    var saved_parent_password=localStorage.getItem(storage_id+'parent_account_password');
    parent_account_password=saved_parent_password!=null ? saved_parent_password : parent_account_password;

    if(platform==='samsung'){
        $('#vod-series-player-video-lg').hide();
        $('#channel-page-video-lg').hide();
    }else if(platform==='lg'){
        $('#vod-series-player-video').hide();
        $('#channel-page-video').hide();
    }
    $('#app').addClass(platform);
    login_page.getPlayListDetail();
    updateTimer();
    setInterval(function (){
        updateTimer();
    },30000)

    if(platform==='samsung'){
        document.addEventListener("visibilitychange", function(){
            if(document.hidden)
            {
                webapis.avplay.suspend();
            }
            else
            {
                webapis.avplay.restore();
            }
        });
    }
    else if(platform==='lg'){
        document.addEventListener('keyboardStateChange', keyboardVisibilityChange, false);
    }
    document.addEventListener('keydown', function(e) {
        if(platform==='samsung'){
            if(e.keyCode==tvKey.EXIT)
                tizen.application.getCurrentApplication().exit();
            switch (e.keyCode) {
                case 65376: // Done
                case 65385: // Cancel
                    $('input').blur();
                    return;
            }
        }
        if(app_loading)
            return;
        switch (current_route) {
            case "login-page":
                login_page.HandleKey(e);
                break;
            case "home-page":
                home_page.HandleKey(e);
                break;
            case "channel-page":
                channel_page.HandleKey(e);
                break;
            case "vod-series-page":
                vod_series_page.HandleKey(e);
                break;
            case "vod-summary-page":
                vod_summary_page.HandleKey(e);
                break;
            case "vod-series-player-video":
                vod_series_player_page.HandleKey(e);
                break;
            case "trailer-page":
                trailer_page.HandleKey(e);
                break;
            case "seasons-page":
                seasons_variable.HandleKey(e);
                break;
            case "episode-page":
                episode_variable.HandleKey(e);
                break;
            case "series-summary-page":
                series_summary_page.HandleKey(e);
                break;
            case "setting-page":
                setting_page.HandleKey(e);
                break;
            case "parent-confirm-page":
                parent_confirm_page.HandleKey(e);
                break;
            case "turn-off-page":
                turn_off_page.HandleKey(e);
                break;
            case "activation-page":
                activation_page.HandleKey(e);
                break;
            case "channel-category-page":
                channel_category_page.HandleKey(e);
                break;
            case "search-page":
                search_page.HandleKey(e);
                break;
            case "terms-page":
                terms_page.HandleKey(e);
                break;
            case "help-page":
                help_page.HandleKey(e);
                break;
        }
    });
})

function keyboardVisibilityChange(event) {
    var visibility = event.detail.visibility;
    if(visibility){
        keyboard_displayed=true;
    }
    else{
        keyboard_displayed=false;
        $('input').blur();
    }
}