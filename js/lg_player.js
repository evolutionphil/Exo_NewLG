"use strict";
var lg_player={
    id:'',
    videoObj:null,
    parent_id:'',
    current_time:0,
    STATES:{
        STOPPED: 0,
        PLAYING: 1,
        PAUSED: 2,
        PREPARED: 4
    },
    init:function(id, parent_id) {
        this.id=id;
        this.videoObj=null;     // tag video
        this.parent_id=parent_id;
        this.current_time=0;

        this.state = this.STATES.STOPPED;
        this.videoObj = document.getElementById(id);
        var  videoObj=this.videoObj;
        var  that=this;
        this.videoObj.addEventListener("error", function(e) {
            console.log("Error");
            $('#'+that.parent_id).find('.video-error').show();
        });
        this.videoObj.addEventListener("canplay", function(e) {
            $('#'+that.parent_id).find('.video-error').hide();
        });
        this.videoObj.addEventListener('durationchange', function(event){
            // $('#'+that.parent_id).find('.video-error').hide();
        });
        this.videoObj.addEventListener('loadeddata', function(event){
            var  duration=parseInt(videoObj.duration);
            $('#'+that.parent_id).find('.video-total-time').text(that.formatTime(duration));
            if(current_route==='vod-series-player-video'){
                vod_series_player_page.showResumeBar();
            }
        });

        this.videoObj.ontimeupdate = function(event){
            // $('#'+that.parent_id).find('.video-error').hide();
            var duration = that.videoObj.duration;
            var  currentTime=that.videoObj.currentTime;
            
            if (duration > 0) {
                $('#'+that.parent_id).find('.video-progress-bar-slider').val(currentTime).change();
                $('#'+that.parent_id).find('.video-current-time').html(that.formatTime(currentTime));
                $('#'+that.parent_id).find('.progress-amount').css({width:currentTime/duration*100+'%'});
                
                // **CRITICAL FIX: Connect subtitle timing updates**
                if (typeof SrtOperation !== 'undefined' && !SrtOperation.stopped) {
                    SrtOperation.timeChange(currentTime);
                } else {
                }
            }
        };
        this.videoObj.addEventListener('loadedmetadata', function() {
            //     var  duration=parseInt(videoObj.duration);
            //     $('#'+that.parent_id).find('.video-total-time').text(that.formatTime(duration));
        });
        this.videoObj.addEventListener('waiting', function(event){
            // console.log('Video is waiting for more data.',event);
        });
        this.videoObj.addEventListener('suspend', function(event){
            // $('#'+that.parent_id).find('.video-error').show();
        });
        this.videoObj.addEventListener('stalled', function(event){
            // $('#'+that.parent_id).find('.video-error').show();
            console.log('Failed to fetch data, but trying.');
        });
        this.videoObj.addEventListener('ended', function(event){
            if(current_route==='vod-series-player-video')
                vod_series_player_page.showNextVideo(1);
        });
        this.videoObj.addEventListener('emptied', function(event){
            // console.log("Empty");
            // $('#'+that.parent_id).find('.video-error').show();
        });
    },
    playAsync:function(url){
        try{
            this.videoObj.pause();
        }catch (e) {
        }
        console.log(url);
        var  that=this;
        $('#'+this.parent_id).find('.video-error').hide();
        while (this.videoObj.firstChild)
            this.videoObj.removeChild(this.videoObj.firstChild);
        this.videoObj.load();
        var source = document.createElement("source");
        source.setAttribute('src',url);
        this.videoObj.appendChild(source);
        this.videoObj.play();
        $('#'+this.parent_id).find('.progress-amount').css({width:0})

        source.addEventListener("error", function(e) {
            $('#'+that.parent_id).find('.video-error').show();
        });
        source.addEventListener('emptied', function(event){
            console.log("Empty");
            $('#'+that.parent_id).find('.video-error').show();
        });
        this.state=this.STATES.PLAYING;
    },
    play:function(){
        this.state=this.STATES.PLAYING;
        this.videoObj.play();
    },
    setDisplayArea:function() {
    },
    pause:function() {
        this.state = this.STATES.PAUSED;
        try{
            this.videoObj.pause();
        }catch (e) {
        }
    },
    close:function(){
        try{
            this.videoObj.pause();
        }catch (e) {
        }
        this.state=this.STATES.STOPPED;
    },
    formatTime:function(seconds) {
        var hh = Math.floor(seconds / 3600),
            mm = Math.floor(seconds / 60) % 60,
            ss = Math.floor(seconds) % 60;
        return (hh ? (hh < 10 ? "0" : "") + hh + ":" : "") +
            ((mm < 10) ? "0" : "") + mm + ":" +
            ((ss < 10) ? "0" : "") + ss;
    },
    seekTo:function(seekTime){

    },
    getSubtitleOrAudioTrack:function(kind){
        var totalTrackInfo
        if(kind=="TEXT"){
            totalTrackInfo=this.videoObj.textTracks;
        }else{
            totalTrackInfo=this.videoObj.audioTracks;
            console.log('=== ORIGINAL LG AUDIO TRACK DEBUG ===');
            console.log('videoObj exists:', !!this.videoObj);
            console.log('audioTracks object:', totalTrackInfo);
            console.log('audioTracks type:', typeof totalTrackInfo);
            console.log('audioTracks length:', totalTrackInfo ? totalTrackInfo.length : 'undefined');
            console.log('Video ready state:', this.videoObj ? this.videoObj.readyState : 'no video');
            console.log('Video current time:', this.videoObj ? this.videoObj.currentTime : 'no video');
            console.log('=== END ORIGINAL LG DEBUG ===');
        }
        return totalTrackInfo;
    },
    setSubtitleOrAudioTrack:function(kind, index){
        if(kind=='TEXT'){
            for(var i=0;i<this.videoObj.textTracks.length;i++){
                this.videoObj.textTracks[i].mode = 'hidden';
            }
            this.videoObj.textTracks[index].mode = 'showing';
        }else{
            for (var i = 0; i < this.videoObj.audioTracks.length; i++) {
                this.videoObj.audioTracks[i].enabled = false;
            }
            this.videoObj.audioTracks[index].enabled = true;
        }
    }
}
