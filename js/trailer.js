"use strict";
var trailer_page={
    player:null,
    done : false,
    back_url:'home-page',
    is_paused:false,
    is_loading:false,
    init:function(url,prev_route){
        showLoader(true);
        this.is_loading=true;
        this.back_url=prev_route;
        this.is_paused=false;
        $('#vod-summary-page').addClass('hide');
        $('#series-summary-page').addClass('hide');
        $('#trailer-player-page').show();
        current_route="trailer-page";
        trailer_page.player = new YT.Player('trailer-player', {
            height: '100%',
            width: '100%',
            videoId: url,
            events: {
                'onReady': trailer_page.onPlayerReady,
                'onStateChange': trailer_page.onPlayerStateChange
            }
        });
        $("#trailer-player").on("load", function() {
            $("#trailer-player").contents().find('.ytp-chrome-top-buttons').hide();
            $("#trailer-player").contents().find('.ytp-right-controls').hide();
            showLoader(false);
            trailer_page.is_loading=false;
            $(document.getElementById('trailer-player').contentWindow.document).keydown(function(e) {
                switch (e.keyCode) {
                    case tvKey.RETURN:
                        trailer_page.goBack();
                        break;
                    case tvKey.RIGHT:
                        trailer_page.seekTo(5);
                        break;
                    case tvKey.LEFT:
                        trailer_page.seekTo(-5);
                        break;
                    case tvKey.ENTER:
                        trailer_page.playOrPause();
                        break;
                }
            });
        });
    },
    goBack:function(){
        current_route=this.back_url;
        this.player.stopVideo();
        $('#trailer-player-page').hide();
        $('#trailer-player').remove();
        $('#trailer-player-page').html('<div id="trailer-player"></div>');
        if(this.back_url==="vod-summary-page")
            $('#vod-summary-page').removeClass('hide');
        if(this.back_url==="series-summary-page")
            $('#series-summary-page').removeClass('hide');
    },
    onPlayerReady:function(event) {
        event.target.playVideo();
    },
    onPlayerStateChange:function (event) {

    },
    seekTo:function(step){
        var current_time=this.player.getCurrentTime();
        var new_time=current_time+step;
        var duration=this.player.getDuration();
        if(new_time<0)
            new_time=0;
        if(new_time>duration)
            new_time=duration;
        this.player.seekTo(new_time);
    },
    playOrPause:function(){
        if(this.is_paused)
            this.player.playVideo();
        else
            this.player.pauseVideo();
        this.is_paused=!this.is_paused;
    },
    HandleKey:function (e) {
        if(this.is_loading)
            return;
        switch (e.keyCode) {
            case tvKey.RETURN:
                this.goBack();
                break;
            case tvKey.RIGHT:
                this.seekTo(5);
                break;
            case tvKey.LEFT:
                this.seekTo(-5);
                break;
            case tvKey.ENTER:
                this.playOrPause();
                break;
        }
    }
}