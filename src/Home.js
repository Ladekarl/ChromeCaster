import React, {Component} from 'react';
import {WebView} from 'react-native-webview';

class Home extends Component {

    onMessage = event => {
        console.log('_onMessage', JSON.parse(event.nativeEvent.data));
        const res = JSON.parse(event.nativeEvent.data);
        var videoSrc = res.message;
    };

    detectVideoPlayingJs = () => {
        return `
            (function () {
                window.addEventListener("load", function() { 
                    Object.defineProperty(HTMLMediaElement.prototype, 'playing', {
                        get: function(){
                            return !!(this.currentTime > 0 && !this.paused && !this.ended && this.readyState > 2);
                        }
                    })
                    setInterval(function() {
                        var videos = document.querySelectorAll('video');
                        for(var i = 0; i < videos.length; i++) {
                            var video = videos[i];
                            if(video.playing) {
                                window.ReactNativeWebView.postMessage(JSON.stringify({type: "click", message: video.src}));
                            }
                        }
                    }, 1000);
                });
            })();
        `;
    };

    render() {
        return (
            <WebView
                source={{uri: 'https://google.com'}}
                allowsInlineMediaPlayback={true}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                originWhitelist={['*']}
                javaScriptCanOpenWindowsAutomatically={false}
                injectedJavaScript={this.detectVideoPlayingJs()}
                mediaPlaybackRequiresUserAction={true}
                onMessage={this.onMessage}
            />
        );
    }
}

export default Home;
