"use strict";
var SrtOperation={
    current_srt_index:0,
    next_srt_time:0,
    srt:[],
    stopped:false,
    subtitle_shown:false,
    init: function (subtitle, current_time) {  // will set initial time and initial index from parsed subtitle text array
        // we will save always the index and time for current time subtitle text
        $('#'+media_player.parent_id).find('.subtitle-container').html('');
        this.subtitle_shown=false;
        var srt=[];
        if(subtitle.content) {
            try{
                SrtParser.init();
                srt=SrtParser.fromSrt(subtitle.content)
            }catch (e) {
            }
        }
        this.srt=srt;
        if(srt.length>0)
            this.stopped=false;
        else{
            this.stopped=true;
            return;
        }

        this.current_srt_index=this.findIndex(current_time,0,srt.length-1);
        console.log("here found srt index",this.current_srt_index,current_time, srt);
        if(this.current_srt_index<0)
            this.current_srt_index=0;
        this.next_srt_time=0;
    },
    findIndex: function (time,start, end) {  // we will use binary search algorithm here
        if(time==0)
            return 0;

        // Base Condition
        var arr=this.srt;
        if (start > end)
            return end;
        // Find the middle index
        let mid=Math.floor((start + end)/2);

        // Compare mid with given key x
        if (arr[mid].startSeconds<=time && time<arr[mid].endTime)
            return mid;


        // If element at mid is greater than x,
        // search in the left half of mid
        if(arr[mid].startSeconds > time)
            return this.findIndex(time, start, mid-1);
        else
            // If element at mid is smaller than x,
            // search in the right half of mid
            return this.findIndex(time, mid+1, end);
    },
    timeChange:function (current_time) {
        console.log('=== SRT OPERATION timeChange DEBUG ===');
        console.log('Current time received:', current_time);
        console.log('Stopped status:', this.stopped);
        console.log('SRT array length:', this.srt.length);
        console.log('Current SRT index:', this.current_srt_index);
        console.log('Subtitle shown status:', this.subtitle_shown);
        
        if(this.stopped) {
            console.log('SRT Operation stopped, returning');
            return;
        }
        
        if(!this.srt || this.srt.length === 0) {
            console.log('No SRT data available');
            return;
        }
        
        var srt_index=this.current_srt_index;
        var srt_item=this.srt[srt_index];
        
        console.log('Current SRT item:', srt_item);
        console.log('Start time:', srt_item.startSeconds);
        console.log('End time:', srt_item.endSeconds);
        console.log('Text:', srt_item.text);
        console.log('Media player parent ID:', media_player.parent_id);
        
        if(current_time>=srt_item.startSeconds && current_time<srt_item.endSeconds){
            console.log('=== SHOWING SUBTITLE ===');
            console.log('Time matches current subtitle:', current_time, '>=', srt_item.startSeconds, '&&', current_time, '<', srt_item.endSeconds);
            if(!this.subtitle_shown) {
                console.log('Displaying subtitle text:', srt_item.text);
                var container = $('#'+media_player.parent_id).find('.subtitle-container');
                console.log('Container found:', container.length > 0);
                console.log('Container visibility:', container.is(':visible'));
                console.log('Container CSS display:', container.css('display'));
                console.log('Container CSS visibility:', container.css('visibility'));
                
                container.html(srt_item.text);
                this.subtitle_shown = true;
                console.log('Subtitle displayed successfully');
            } else {
                console.log('Subtitle already shown');
            }
        }
        else if(current_time>srt_item.endSeconds) {
            console.log('=== TIME PAST CURRENT SUBTITLE ===');
            var next_srt_item=this.srt[srt_index+1];
            console.log('Next SRT item:', next_srt_item);
            try{
                if(current_time<next_srt_item.startSeconds){
                    console.log('=== HIDING SUBTITLE (between subtitles) ===');
                    if(this.subtitle_shown){
                        $('#'+media_player.parent_id).find('.subtitle-container').html('');
                        this.subtitle_shown=false;
                        console.log('Subtitle hidden');
                    }
                }else if(next_srt_item.endSeconds>current_time){
                    console.log('=== SHOWING NEXT SUBTITLE ===');
                    $('#'+media_player.parent_id).find('.subtitle-container').html(next_srt_item.text);
                    this.subtitle_shown=true;
                    this.current_srt_index+=1;
                    console.log('Next subtitle shown:', next_srt_item.text);
                }else   // in this case, have to find the next index;
                {
                    console.log("=== FINDING NEW SRT INDEX ===");
                    this.current_srt_index=this.findIndex(current_time,0,this.srt.length-1);
                    if(this.current_srt_index<0)
                        this.current_srt_index=0;
                    console.log('New index found:', this.current_srt_index);
                }
            }catch (e) {
                console.log("subtitle timer issue",e);
            }
        }
        else if(current_time<srt_item.startSeconds) {
            console.log('=== TIME BEFORE CURRENT SUBTITLE ===');
            try{
                this.current_srt_index=this.findIndex(current_time,0,this.srt.length-1);
                if(this.current_srt_index<0)
                    this.current_srt_index=0;
                console.log('Adjusted index for earlier time:', this.current_srt_index);
            }catch (e) {
                console.log('Error adjusting index:', e);
            }
        }
        console.log('=== END SRT OPERATION timeChange DEBUG ===');
    },
    stopOperation: function () {
        this.stopped=true;
        $('#'+media_player.parent_id).find('.subtitle-container').html('');
        this.subtitle_shown=false
    },
    deStruct:function () {
        this.srt=[];
        this.stopped=true;
        $('#'+media_player.parent_id).find('.subtitle-container').html('');
    }
}
