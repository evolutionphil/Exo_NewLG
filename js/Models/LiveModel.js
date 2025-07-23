"use strict";
var LiveModel={
    movies:[],
    category_name:'live_categories',
    favourite_movie_count:200,
    recent_movie_count:40,
    movie_key:"stream_id",
    categories:[],
    programmes:{},
    movie_saved:false,
    programme_saved:false,
    favourite_ids:[],
    stream_type:'live',
    favourite_insert_position:'after',
    recent_insert_position:'before',
    favourite_position:1,
    recent_position:0,
    category_orders:[],
    hidden_category_ids:[],
    init:function() {
        this.movies=[];
        this.categories=[];
        this.recent_position=0;
        this.favourite_position=1;
    },
    setCategories:function(categories){
        var stream_type=this.stream_type;
        var hidden_categories=localStorage.getItem(storage_id+settings.playlist.id+stream_type+"_hiddens");
        hidden_categories=hidden_categories==null ? [] : JSON.parse(hidden_categories);
        categories.map(function(category){
            category.is_hide = hidden_categories.includes(category.category_id);
        })
        this.categories=categories;
    },
    saveHiddenCategories:function(category_ids){
        var stream_type=this.stream_type;
        var categories=this.categories;
        categories.map(function(category){
            category.is_hide=false;
            if(category_ids.includes(category.category_id)) {
                category.is_hide = true;
            }
        })
        localStorage.setItem(storage_id+settings.playlist.id+stream_type+"_hiddens",JSON.stringify(category_ids))
    },
    getCategories:function(include_hide_category,include_favourite_recent){
        var categories=this.categories.filter(function(category){
            if(include_favourite_recent){
                if(!include_hide_category)
                    return !category.is_hide;
                else
                    return true;
            }
            else{
                if(!include_hide_category)
                    return !category.is_hide && (category.category_id!=="favourite" && category.category_id!=="recent");
                else
                    return category.category_id!=="favourite" && category.category_id!=="recent";
            }
        })
        return categories;
    },
    setMovies:function( movies){
        this.movies=movies;
    },
    insertMoviesToCategories:function(){
        var category_orders=localStorage.getItem(storage_id+settings.playlist.id+'_category_orders');
        if(category_orders)
            category_orders=JSON.parse(category_orders);
        else
            category_orders=[];
        this.category_orders=category_orders;

        var channel_orders=localStorage.getItem(storage_id+settings.playlist.id+'_channel_orders');
        if(!channel_orders)
            channel_orders={};
        else
            channel_orders=JSON.parse(channel_orders);
        var stream_type=this.stream_type;
        var movies=this.movies;
        var categories=this.categories;
        var recent_category={
            category_id:'recent',
            category_name:'Recently Viewed',
            parent_id:0,
            movies:[],
            is_hide:false
        }
        var favourite_category={
            category_id:'favourite',
            category_name:'Favourites',
            parent_id:0,
            movies:[],
            is_hide:false
        }
        var undefined_category={
            category_id:'undefined',
            category_name:'Uncategorized',
            parent_id:0,
            movies:[],
            is_hide:false
        }
        categories.push(undefined_category);
        var movie_id_key=this.movie_key;
        var recent_movie_ids=JSON.parse(localStorage.getItem(storage_id+settings.playlist.id+stream_type+"_recent"));
        var favourite_movie_ids=JSON.parse(localStorage.getItem(storage_id+settings.playlist.id+stream_type+"_favourite"));
        recent_movie_ids=recent_movie_ids==null ? [] : recent_movie_ids;
        favourite_movie_ids=favourite_movie_ids==null ? [] : favourite_movie_ids;
        this.favourite_ids=favourite_movie_ids;

        var recent_movies=[], favourite_movies=[];
        var that=this;
        var movies_map={};
        for(var i=0;i<movies.length;i++){
            var movie=movies[i];
            if(typeof movie.category_id=='undefined' || movie.category_id=='null' || movie.category_id==null)
                movie.category_id='undefined';
            var category_id=movie.category_id.toString()
            if(typeof movies_map[category_id]=="undefined"){
                movies_map[category_id]=[movie];
            }else{
                movies_map[category_id].push(movie);
            }
            movie.is_recent=false;
            if(recent_movie_ids.includes(movie[movie_id_key]))// if movie id is in recently viewed movie ids
            {
                if(that.recent_insert_position==="before")
                    recent_movies.unshift(movie);
                else
                    recent_movies.push(movie);
                movie.is_recent=true;
            }
            if(favourite_movie_ids.includes(movie[movie_id_key]))// if movie id is in recently viewed movie ids
            {
                if(that.favourite_insert_position==="before")
                    favourite_movies.unshift(movie);
                else
                    favourite_movies.push(movie);
            }
        }
        for(var  i=0;i<categories.length;i++){ // except favourite, and recent movies
            var category_id=categories[i].category_id.toString();
            var movies=!movies_map[category_id] ? [] : movies_map[category_id];
            categories[i].movies=movies;
        }
        recent_category.movies=recent_movies;
        favourite_category.movies=favourite_movies;
        categories.unshift(favourite_category);
        categories.unshift(recent_category);

        for(var i=0;i<categories.length;i++){
            if(categories[i].category_id==='undefined'){
                if(categories[i].movies && categories[i].movies.length==0){
                    categories.splice(i,1);
                }
                break;
            }
        }

        for(var i=0;i<category_orders.length;i++){
            for(j=0;j<categories.length;j++){
                if(category_orders[i].id==categories[j].category_id){
                    categories=makeRearrangeArray(categories,j,category_orders[i].position);
                    break;
                }
            }
        }
        for(var i=0;i<categories.length;i++){
            if(categories[i].category_id=='favourite')
                this.favourite_position=i;
            if(categories[i].category_id=='recent')
                this.recent_position=i;
            if(channel_orders[categories[i].category_id]){  // rearrange started.
                var orders=channel_orders[categories[i].category_id];
                var movies=categories[i].movies;
                for(var j=0;j<orders.length;j++){
                    for(var k=0;k<movies.length;k++){
                        if(orders[j].id==movies[k].stream_id && orders[j].name==movies[k].name){
                            movies=makeRearrangeArray(movies,k,orders[j].position);
                            break;
                        }
                    }
                }
                categories[i].movies=movies;
            }
        }
        this.categories=categories;
        this.movies=[];
    },
    getRecentOrFavouriteCategoryPosition:function(kind){
        return this[kind+'_position'];
    },
    getRecentOrFavouriteCategory:function(kind){
        var category_index=this.getRecentOrFavouriteCategoryPosition(kind);
        return this.categories[category_index];
    },
    setRecentOrFavouriteMovies:function(movies, kind){
        var stream_type=this.stream_type;
        var category_index=this.getRecentOrFavouriteCategoryPosition(kind);
        this.categories[category_index].movies=movies;
        var movie_id_key=this.movie_key;
        var movie_ids=movies.map(function(item){
            return item[movie_id_key];
        })
        if(kind==='favourite')
            this.favourite_ids=movie_ids;
        localStorage.setItem(storage_id+settings.playlist.id+stream_type+"_"+kind, JSON.stringify(movie_ids));
    },
    addRecentOrFavouriteMovie:function(movie, kind) {
        var category=this.getRecentOrFavouriteCategory(kind);
        var movies=category.movies;
        var exist=false;
        var movie_id_key=this.movie_key;
        var is_added=false; // if added, it will be true
        for(var i=0;i<movies.length;i++){
            if(movies[i][movie_id_key]==movie[movie_id_key]){
                exist=true;
                break;
            }
        }
        if(!exist){
            var insert_position=this[kind+"_insert_position"];
            if(insert_position==="before")
                movies.unshift(movie);
            else
                movies.push(movie);
            var max_count=this[kind+"_movie_count"];
            movies=movies.splice(0,max_count);
            this.setRecentOrFavouriteMovies(movies, kind)
            is_added=true;
        }
        return is_added;
    },
    removeRecentOrFavouriteMovie:function(movie_id, kind) {
        var movies=this.getRecentOrFavouriteCategory(kind).movies;
        var movie_id_key=this.movie_key;
        var is_removed=false;
        for(var i=0;i<movies.length;i++){
            if(movies[i][movie_id_key]==movie_id){
                movies.splice(i,1);
                is_removed=true;
                break;
            }
        }
        this.setRecentOrFavouriteMovies(movies,kind);
        return is_removed;
    },
    getProgrammeVideoUrl:function(channel_id,programme){
        var start_time=moment(programme.start).format('Y-MM-DD:HH-mm')
        var duration=getMinute(programme.stop)-getMinute(programme.start);
        var url=api_host_url+"/"+"streaming/timeshift.php?username="+user_name+"&password="+password+
            "&stream="+channel_id+"&start="+start_time+"&duration="+duration;
        return {
            duration:duration,
            url:url
        }
    },
    getMovieFromId:function(id){
        var movies=this.movies;
        var result=null;
        this.categories.map(function (item) {
            movies=movies.concat(item.movies);
        })
        for(var i=0;i<movies.length;i++){
            if(movies[i].stream_id==id)
            {
                result=movies[i];
                break;
            }
        }
        return result;
    },
    getNextProgrammes:function(programmes){
        var current_program_exist=false;
        var next_programmes=[];
        var current_time=moment(new Date()).unix();
        var k=0;
        for(var i=0;i<programmes.length;i++){
            var item=programmes[i];
            var stop=getLocalChannelTime(item.stop).unix();
            if(stop>=current_time){
                k++;
                var start=getLocalChannelTime(item.start).unix();
                if(start<=current_time)
                    current_program_exist=true;
                next_programmes.push(programmes[i]);
            }
            if(k>=4)
                break;
        }
        return {
            current_program_exist:current_program_exist,
            programmes:next_programmes
        }
    },
    getProgressWidth:function (programme) {
        var current_time=moment().unix();
        var start_time=moment(programme.start).unix();
        var end_time=moment(programme.stop).unix();
        var percentage=(current_time-start_time)/(end_time-start_time)*100;
        return percentage;
    }
}
