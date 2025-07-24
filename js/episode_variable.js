"use strict";
var episode_variable={
    keys:{
        focused_part:'grid_part', // grid_part
        index:0
    },
    init:function(){

    },
    Exit:function(){
        $('#episode-page').hide();
    },
    showMovie:function(index){
        this.Exit();
        var episode_buttons=$('.episode-grid-item-wrapper');
        this.keys.focused_part="grid_part";
        this.keys.index=index;
        $('.episode-grid-item-wrapper').removeClass('active');
        $('#episode-page-back-button').removeClass('active');
        $(episode_buttons[index]).addClass('active');
        var episodes=current_season.episodes;
        current_episode=episodes[index];
        vod_series_player_page.init(current_episode,'series',"episode-page",'')
    },
    moveKey:function(increment){
        var keys=this.keys;
        if(keys.focused_part==="back_button"){
            if(increment>0){
                keys.focused_part="grid_part";
                keys.index=0;
                $('#episode-page-back-button').removeClass('active');
                $($('.episode-grid-item-wrapper')[0]).addClass('active');
            }
        }
        else{
            var season_buttons=$('.episode-grid-item-wrapper');
            keys.index+=increment;
            if(keys.index<0){
                keys.focused_part="back_button";
                $('.episode-grid-item-wrapper').removeClass('active');
                $('#episode-page-back-button').addClass('active');
            }
            else{
                if(keys.index>=season_buttons.length)
                    keys.index=season_buttons.length-1;
                $('.episode-grid-item-wrapper').removeClass('active');
                moveScrollPosition($('#episode-grid-container'),season_buttons[keys.index],'vertical')
                $(season_buttons[keys.index]).addClass('active');
            }
        }
    },
    handleClick:function(){
        var element;
        var keys=this.keys;
        if(keys.focused_part==="back_button")
            element=$('#episode-page-back-button');
        else{
            var season_buttons=$('.episode-grid-item-wrapper');
            element=season_buttons[keys.index];
        }
        $(element).trigger('click');
    },
    goBack:function(){
        this.keys.focused_part="grid_part";
        this.keys.index=0;
        $('.episode-grid-item-wrapper').removeClass('active');
        $('#episode-page-back-button').addClass('active');

        current_route="seasons-page";
        $('#episode-page').hide();
        $('#seasons-page').show();
    },
    HandleKey:function(e){
        switch(e.keyCode){
            case tvKey.LEFT:
                this.moveKey(-1);
                break;
            case tvKey.RIGHT:
                this.moveKey(1);
                break;
            case tvKey.UP:
                this.moveKey(-5);
                break;
            case tvKey.DOWN:
                this.moveKey(5);
                break;
            case tvKey.ENTER:
                this.handleClick();
                break;
            case tvKey.RETURN:
                this.goBack();
                break;
        }
    }
}