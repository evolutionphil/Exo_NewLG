# Overview

This is a cross-platform IPTV (Internet Protocol Television) application designed for Smart TVs, specifically supporting Samsung Tizen and LG WebOS platforms. The application provides live television streaming, video-on-demand (VOD), series content, and comprehensive media playback capabilities with features like EPG (Electronic Program Guide), subtitle support, and user authentication through encrypted panel-based backends.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Multi-platform Support**: Native implementations for Samsung Tizen (`webapis.avplay`) and LG WebOS (`webOS media APIs`) with automatic platform detection
- **Responsive Design**: CSS-based responsive layout system with platform-specific adaptations and TV remote control navigation
- **Component-based Structure**: Modular JavaScript architecture with separate page controllers (`home_operation.js`, `channel_operation.js`, `vod_series_page.js`, etc.)
- **Media Player Abstraction**: Platform-specific media players (`mediaPlayer.js` for Samsung, `lg_player.js` for LG) with unified interface

## Authentication & Security
- **Multi-panel Load Balancing**: Automatic rotation between multiple backend panel URLs with failover protection
- **Device Registration**: Unique device ID generation with MAC address binding for device authentication
- **Encrypted Communication**: All API requests use CryptoJS encryption for secure data transmission
- **Trial System**: Built-in trial mode with activation code functionality for user upgrades

## Content Management
- **Three Content Types**: Separate models for Live TV (`LiveModel.js`), Video-on-Demand (`VodModel.js`), and Series content (`SeriesModel.js`)
- **Category System**: Hierarchical content organization with user-customizable category hiding and sorting
- **Favorites & Recent**: User preference tracking with configurable storage limits (200 favorites, 40 recent items)
- **EPG Integration**: Electronic Program Guide with time-shifted viewing and catch-up TV support

## Media Playback
- **Dual Player System**: Platform-specific video players with hardware acceleration support
- **Subtitle Support**: SRT subtitle parsing and rendering with automatic subtitle fetching from external APIs
- **Resume Functionality**: Video playback position saving and restoration across sessions
- **Audio Track Selection**: Multiple audio track support with user selection interface

## Data Storage
- **Local Storage Strategy**: Client-side storage using localStorage with namespaced keys for multi-user support
- **Settings Persistence**: User preferences, viewing history, and configuration data stored locally
- **Cache Management**: Configurable cache clearing and data management options

## User Interface
- **TV-Optimized Navigation**: D-pad and remote control navigation with focus management
- **Modal System**: Bootstrap-based modal dialogs for settings, authentication, and content selection
- **Search Functionality**: Real-time search across all content types with debounced input handling
- **Parental Controls**: PIN-based access control for age-restricted content

## Development Tooling
- **Build System**: Node.js-based development server with Express.js for local testing
- **WebOS Packaging**: Automated IPK package generation for LG WebOS deployment
- **Version Synchronization**: Build tools for maintaining version consistency across platform-specific manifests

# External Dependencies

## Smart TV Platform APIs
- **Samsung Tizen**: `webapis.avplay` for video playback, `tizen.tvinputdevice` for remote control input
- **LG WebOS**: WebOS media framework APIs and Magic Remote gesture support

## Backend Services
- **Panel URLs**: Primary backend at `https://exoapp.tv/9dlE9XWmiwmAn2j` for user authentication and content metadata
- **Subtitle API**: External subtitle fetching service with TMDB integration for movie/series subtitle retrieval

## Third-party Libraries
- **jQuery 3.4.1**: DOM manipulation and AJAX requests
- **Bootstrap 4.4.1**: UI components and responsive grid system
- **Moment.js**: Date/time handling and formatting
- **CryptoJS 4.1.1**: Client-side encryption for secure API communication
- **Font Awesome 5.12.1**: Icon system for UI elements

## Development Dependencies
- **Express.js**: Local development server for testing and development
- **Archiver**: WebOS app packaging and compression
- **WebOS CLI Tools**: LG WebOS development and deployment utilities