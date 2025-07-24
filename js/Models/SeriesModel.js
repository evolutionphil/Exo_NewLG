"use strict";
var SeriesModel={
    movies:[],
    favourite_movie_count:200,
    recent_movie_count:40,
    movie_key:"series_id",
    categories:[],
    saved_video_times:{},
    favourite_ids:[],
    stream_type:'series',
    favourite_insert_position:'after',
    recent_insert_position:'before',
    hidden_category_ids:[],


    init:function() {
        this.movies=[];
        this.categories=[];
    },
    setCategories:function(categories){
        var stream_type=this.stream_type;
        var temps=localStorage.getItem(storage_id+settings.playlist.id+"_saved_"+stream_type+"_times");
        if(temps)
            this.saved_video_times=JSON.parse(temps);
        else
            this.saved_video_times={};
        var hidden_categories=localStorage.getItem(storage_id+settings.playlist.id+stream_type+"_hiddens");
        hidden_categories=hidden_categories==null ? [] : JSON.parse(hidden_categories);
        categories.map(function(category){
            category.is_hide = hidden_categories.includes(category.category_id);
        })
        this.categories=categories;
    },
    saveVideoTime:function(stream_id, time){
        var stream_type=this.stream_type;
        var saved_video_times=this.saved_video_times;
        saved_video_times[stream_id.toString()]=time;
        this.saved_video_times=saved_video_times;
        localStorage.setItem(storage_id+settings.playlist.id+"_saved_"+stream_type+"_times",JSON.stringify(saved_video_times));
    },
    removeVideoTime:function (stream_id) {
        var stream_type=this.stream_type;
        var saved_video_times=this.saved_video_times;
        delete saved_video_times[stream_id.toString()];
        this.saved_video_times=saved_video_times;
        localStorage.setItem(storage_id+settings.playlist.id+"_saved_"+stream_type+"_times",JSON.stringify(saved_video_times));
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
        // movies.map(function(movie){
        for(var i=0;i<movies.length;i++){
            // for(var i=0;i<100;i++){
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
            // });
        }
        for(var  i=0;i<categories.length;i++){ // except favourite, and recent movies
            var category_id=categories[i].category_id.toString();
            categories[i].movies=typeof movies_map[category_id]=='undefined' ? [] : movies_map[category_id];
        }
        recent_category.movies=recent_movies;
        favourite_category.movies=favourite_movies;
        categories.unshift(favourite_category);
        categories.unshift(recent_category);
        // categories.unshift(all_category);
        for(var i=0;i<categories.length;i++){
            if(categories[i].category_id==='undefined'){
                if(categories[i].movies.length==0){
                    categories.splice(i,1);
                }
                break;
            }
        }
        var all_category= {
            category_id: 'all',
            category_name: 'All',
            parent_id: 0,
            is_hide: false,
            movies: []
        };
        categories.unshift(all_category);
        this.categories=categories;
        this.movies=[];
    },
    getRecentOrFavouriteCategoryPosition:function(kind){
        if(kind==='favourite')
            return 2;
        else
            return 1;
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

}
