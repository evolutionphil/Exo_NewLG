"use strict";
var settings={
    playlist_id:0,
    playlist:{},
    vod_sort:"added", // or a-z, z-a, rating, number
    series_sort:"added",
    live_sort:"added",
    sort_keys:{
        added:'Added',
        number:'Number',
        rating:'Rating',
        'a_z':'A-Z',
        'z_a':'Z-A',
        name:'Name',
        default:'Default'
    },
    language:'en',
    time_format:'24',
    playlist_type:'',
    buffer_size:5,
    min_buffer_size:4,
    max_buffer_size:15,
    element_color:'',
    focus_color:'#ffff00',
    bg_focus_color:'rgba(95, 5, 140, 0.8)',
    epg_txt_color:'rgba(255, 251, 0, 0.8)',
    terms_accepted:0,
    lock_state:'off',
    mac_address:'',
    initFromLocal:function(){
        var temp=localStorage.getItem(storage_id+'playlist_id');
        if(temp)
            this.playlist_id=temp;
        else
            this.playlist_id=0;

        var keys=[
            'terms_accepted','vod_sort','series_sort','buffer_size','time_format','live_sort',
            'element_color','focus_color','epg_txt_color','lock_state','bg_focus_color','mac_address'
        ];
        var that=this;
        keys.map(function (key) {
            temp=localStorage.getItem(storage_id+key);
            if(temp)
                that[key]=temp;
        })
        this.buffer_size=parseInt(this.buffer_size);
        this.terms_accepted=parseInt(this.terms_accepted);

        temp=localStorage.getItem(storage_id+'language');
        if(temp)
            this.language=temp;
        else{
            if(typeof navigator.language!='undefined'){
                var lang_tmps=navigator.language.split('-');
                this.language=lang_tmps[0];
            }
        }
        if(this.mac_address){
            mac_address=this.mac_address
            $('#mac-address').text(mac_address);
            $('.mac-address').text(mac_address);
        }
    },
    resetDefaultValues:function (){
        this.playlist_id=0;
        this.playlist={};
        this.vod_sort="added"; // or a-z; z-a; rating; number
        this.series_sort="added";
        this.live_sort="added";
        this.language='en';
        this.time_format='24';
        this.playlist_type='';
        this.buffer_size=5;
        this.min_buffer_size=4;
        this.max_buffer_size=15;
        this.element_color='';
        this.focus_color='#ffff00';
        this.bg_focus_color='#F50561';
        this.epg_txt_color='#ee0000';
        this.lock_state='off';
    },
    saveSettings:function(key, value,type){
        this[key]=value;
        if(type==='object' || type==='array')
            value=JSON.stringify(value);
        localStorage.setItem(storage_id+key,value);
    }
}