djay2itunes.js
==============

Copy BPMs and Keys calculated in Algoriddim **djay** or **[djay Pro](https://www.algoriddim.com/djay-mac)** for Mac to iTunes meta tags.

- Version: 0.0.3 / 15 January 2015
- Author: [Oleg Fomin](http://ofstudio.ru)
- Email: [ofstudio@gmail.com](mailto:ofstudio@gmail.com)

With this script you can copy BPMs and Keys from Algoriddim djay to iTunes. BPM will be copied to `BPM` tag. Key  will be added at the beginning of `Grouping` tag. Example: `11B-A Bluesdance` or `9B-G WCS`
 
## Compatibility

Tested on:

 - djay Pro 1.0 / djay 4.2.2
 - iTunes 12.0.1
 - Mac OS X 10.10.1
 
**Use at your own risk!** It's recommended to backup iTunes library first.

## Usage 

**[Step-by-step manual](http://yesnomaybe.ofstudio.ru/2015/01/23/djay2itunes-pierienos-mietadannykh-is-djay-pro-v-itunes/)** in Russian.

1. Analize tracks using Algoriddim djay Pro / djay (Library -> Analyze)
2. Close djay application
3. Open iTunes and select necessary tracks
4. Run `djay2itunes.app` (or open djay2itunes.js in Script Editor and run)   
**Note:**  app is not signed. Open  `djay2itunes.app` by "right-click" -> Open to avoid security warnings.
5. Select fields to copy: `BPM`, `Key` or both of them
6. Choose overwrite existing tags or not
7. Done!

## Version history
    
* _2015-01-15_ / **v0.0.3**
    - Fixed error with '8B-C' key (zero index vs false value)
    - Added notification
    - Added progress bar
    - Bug fixes

* _2014-12-28_ / **v0.0.2**   
    - JavaScript instead of AppleScript
    - Both djay Pro and djay are supported
    
* _2014-07-01_ / **v0.0.1**   
    - Based on [Get bpm and key from Djay.scpt](http://edmondcho.com/2012/02/28/copy-calculated-bpm-data-from-algoriddim-djay-to-itunes-using-applescript/) by [djmumbler](https://twitter.com/djmumbler)
    - Write Key at the _beginnig_ of `Grouping` tag so sorting can be applied.
    - Fixed djay manual calculated bpm workaround (file `djay Preset Library.plist`).

## License 

MIT