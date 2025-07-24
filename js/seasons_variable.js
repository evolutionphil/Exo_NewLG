"use strict";
var seasons_variable={
    keys:{
        focused_part:'grid_part', // grid_part
        index:1
    },
    showEpisode:function(index){
        var season_buttons=$('.season-grid-item-wrapper');
        this.keys.focused_part="grid_part";
        this.keys.index=index;
        $('.season-grid-item-wrapper').removeClass('active');
        $('#season-page-back-button').removeClass('active');
        $(season_buttons[index]).addClass('active');
        current_season=current_series.seasons[index];
        console.log(current_season);
        var episodes=current_season.episodes;
        if(typeof episodes!="undefined" && episodes.length>0){
            $('#season-title-container').text(current_season.name);
            var htmlContent="";
            episodes.map(function(episode, index){
                htmlContent+=
                    '<div class="episode-grid-item-wrapper" data-index="'+index+'" onclick="episode_variable.showMovie('+index+')">'+
                        '<img class="episode-image" src="'+episode.info.movie_image+'" onerror="this.src=\'images/404.png\'">'+
                        '<div class="episode-title-wrapper position-relative">'+
                            '<p class="episode-title">'+
                                episode.title+
                            '</p>'+
                        '</div>'+
                    '</div>'
            })
            $('#episode-grid-container').html(htmlContent);
            current_route="episode-page";
            $('#seasons-page').hide();
            $('#episode-page').show();
            $('#episode-grid-container').scrollTop(0);
            $($('.episode-grid-item-wrapper')[0]).addClass('active');
        }
        else{
            showToast("Sorry","No episodes available");
        }
    },
    moveKey:function(increment){
        var keys=this.keys;
        if(keys.focused_part==="back_button"){
            if(increment>0){
                keys.focused_part="grid_part";
                keys.index=0;
                $('#season-page-back-button').removeClass('active');
                $($('.season-grid-item-wrapper')[0]).addClass('active');
            }
        }
        else{
            var season_buttons=$('.season-grid-item-wrapper');
            keys.index+=increment;
            if(keys.index<0){
                keys.focused_part="back_button";
                $('.season-grid-item-wrapper').removeClass('active');
                $('#season-page-back-button').addClass('active');
            }
            else{
                if(keys.index>=season_buttons.length)
                    keys.index=season_buttons.length-1;
                $('.season-grid-item-wrapper').removeClass('active');
                $(season_buttons[keys.index]).addClass('active');
                moveScrollPosition($('#season-grid-container'),season_buttons[keys.index],'vertical')
            }
        }
    },
    handleClick:function(){
        var element;
        var keys=this.keys;
        if(keys.focused_part==="back_button")
            element=$('#season-page-back-button');
        else{
            var season_buttons=$('.season-grid-item-wrapper');
            element=season_buttons[keys.index];
        }
        $(element).trigger('click');
    },
    goBack:function(){
        this.keys.focused_part="grid_part";
        this.keys.index=0;
        $('.season-grid-item-wrapper').removeClass('active');
        $('#season-page-back-button').removeClass('active');
        current_route="series-summary-page";
        $('#seasons-page').hide();
        $('#series-summary-page').show();
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