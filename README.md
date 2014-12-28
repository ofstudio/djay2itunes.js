djay2itunes.js
==============

Copy BPMs and Keys calculated in Algoriddim **djay** or **djay Pro** for Mac to iTunes meta tags.

- Version: 0.0.2 / 28 Dec 2014
- Author: [Oleg Fomin](http://ofstudio.ru)
- Email: [ofstudio@gmail.com](mailto:ofstudio@gmail.com)

With this script you can copy BPMs and Keys from Algoriddim djay to iTunes. BPM will be copied to `BPM` tag. Key  will be added at the beginning of `Grouping` tag. Example: `11B-A Bluesdance` or `9B-G WCS`
 
 ## Compatibility
 - djay Pro 1.0 / djay 4.2.2
 - iTunes 12.0.1
 - Mac OS X 10.10.1
 
**Use at your own risk!** It's recommended to backup iTunes library first.

## Usage 
1. Analize tracks using Algoriddim djay Pro / djay (Library -> Analyze)
2. Close djay application
3. Open iTunes and select necessary tracks
4. Run `djay2itunes.app` (or open djay2itunes.js in Script Editor and run)
5. Select fields to copy: `BPM`, `Key` or both of them
6. Choose overwrite existing tags or not
7. Done!


## In depth

### djay database

...

#### Database location

...

#### Database index format

...


## Version history

* _2014-12-28_ / **v0.0.2**   
    - Rewrited in JavaScript
    - Both djay Pro and djay are supporded
    
* _2014-07-01_ / **v0.0.1**   
    - Based on [Get bpm and key from Djay.scpt](http://edmondcho.com/2012/02/28/copy-calculated-bpm-data-from-algoriddim-djay-to-itunes-using-applescript/) by [djmumbler](https://twitter.com/djmumbler)
    - Write Key at the _beginnig_ of `Grouping` tag so sorting can be applied.
    - Fixed djay manual calculated bpm workaround (file `djay Preset Library.plist`).


## License 

MIT