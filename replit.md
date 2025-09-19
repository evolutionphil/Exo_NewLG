# Overview

This is a cross-platform IPTV (Internet Protocol Television) application designed for Smart TVs, specifically supporting Samsung Tizen and LG WebOS platforms. The application provides live television streaming, video-on-demand (VOD), series streaming, and catch-up TV functionality with advanced features like EPG (Electronic Program Guide), subtitles, and authentication.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Cross-Platform Design**: Single codebase supporting both Samsung Tizen and LG WebOS platforms
- **Platform Detection**: Automatic platform identification via user agent string analysis
- **Responsive UI**: Bootstrap 4.4.1-based interface with custom CSS for TV screen optimization
- **Navigation System**: Remote control navigation using directional keys, enter, and return buttons
- **Component Structure**: Modular page-based architecture with separate JS files for each major feature

## Media Playback System
- **Dual Player Architecture**: 
  - Samsung: Native `webapis.avplay` for hardware-accelerated video playback
  - LG: HTML5 video element with WebOS media APIs integration
- **Adaptive Streaming**: Support for multiple video formats and quality levels
- **Subtitle Support**: SRT subtitle parsing and display with real-time synchronization
- **Audio Track Management**: Multiple audio track selection and switching
- **Resume Functionality**: Video position saving and restoration across sessions

## Authentication & Security
- **Multi-Panel Load Balancing**: Automatic rotation between multiple backend panel URLs for failover protection
- **Device Registration**: Unique device ID generation with MAC address binding
- **Encrypted Communication**: All API requests use CryptoJS encryption for secure data transmission
- **Trial System**: Support for trial accounts with activation code verification

## Data Management
- **Local Storage**: Browser localStorage for user preferences, favorites, and watch history
- **Category Management**: Hierarchical content organization with hide/show functionality
- **Favorites System**: User-configurable favorite content lists across all content types
- **Settings Persistence**: Theme colors, language preferences, and playback settings

## Content Delivery
- **EPG Integration**: Electronic Program Guide with catch-up TV support
- **Search Functionality**: Global search across live channels, VOD, and series content
- **Content Categories**: Dynamic category filtering and sorting options
- **Pagination**: Efficient content loading with incremental rendering for performance

## Platform-Specific Features
- **Samsung Tizen**: 
  - Native remote control support with all Samsung Smart Remote keys
  - Hardware video acceleration via Tizen APIs
  - Application lifecycle management (suspend/restore)
- **LG WebOS**:
  - Magic Remote gesture and pointer control
  - Voice command integration
  - Keyboard state management for text input

# External Dependencies

## Core Libraries
- **jQuery 3.4.1**: DOM manipulation and AJAX operations
- **Bootstrap 4.4.1**: UI framework and responsive grid system
- **Moment.js**: Date/time manipulation and formatting
- **CryptoJS 4.1.1**: Client-side encryption for secure API communication

## Platform SDKs
- **Samsung Tizen WebAPIs**: Native video playback and TV-specific functionality
- **LG WebOS SDK**: Platform integration and media management
- **WebOS Tools CLI**: Development and packaging tools for LG deployment

## Backend Services
- **Panel API**: Primary backend service at `https://exoapp.tv/9dlE9XWmiwmAn2j`
- **Subtitle Service**: External subtitle API integration for VOD content
- **EPG Service**: Electronic Program Guide data provider
- **Authentication Service**: User validation and device registration

## Media Services
- **YouTube API**: Trailer playback functionality
- **M3U Playlist**: IPTV stream format support
- **Multiple Stream Formats**: Support for various video codecs and containers

## Development Tools
- **Express.js**: Local development server
- **Archiver**: WebOS app packaging
- **Rimraf**: Build cleanup utilities
- **Node.js**: Development environment and build tooling