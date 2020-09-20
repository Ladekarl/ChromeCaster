import React, {Component} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faPause, faPlay, faSlidersH, faStop} from '@fortawesome/free-solid-svg-icons';
import GoogleCast from 'react-native-google-cast';

class CasterControl extends Component {

    constructor(props) {
        super(props);

        this.state = {
            playerState: 0,
            position: 0,
            duration: 0,
        };
    }

    componentDidMount() {
        GoogleCast.EventEmitter.addListener(
            GoogleCast.MEDIA_STATUS_UPDATED,
            this.updatedListener,
        );

        GoogleCast.EventEmitter.addListener(
            GoogleCast.MEDIA_PROGRESS_UPDATED,
            this.progressListener,
        );
    }

    updatedListener = ({mediaStatus}) => {
        this.setState({
            playerState: mediaStatus.playerState,
        });
    };

    progressListener = ({mediaProgress}) => {
        this.setState({
            position: mediaProgress.progress,
            duration: mediaProgress.duration,
        });
    };

    startPlaying = () => {
        GoogleCast.play();
    };

    pausePlaying = () => {
        GoogleCast.pause();
    };

    stopPlaying = () => {
        GoogleCast.stop();
    };

    launchOptions = () => {
        GoogleCast.launchExpandedControls();
    };

    formatTimeText = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);


        return (hours > 0 ? hours + ':' : '') +
            (minutes > 0 ? minutes + ':' : (hours > 0 ? '00:' : '')) +
            seconds;
    };

    render() {
        const {playerState, position, duration} = this.state;

        const positionText = this.formatTimeText(position);
        const durationText = this.formatTimeText(duration);

        return (
            <View style={styles.casterContainer}>
                <View style={styles.controlContainer}>
                    {playerState !== 2 &&
                    <TouchableOpacity style={styles.controlButton}
                                      onPress={this.startPlaying}>
                        <FontAwesomeIcon color={'#1a4100'} size={25} icon={faPlay}/>
                    </TouchableOpacity>
                    }
                    {playerState !== 3 &&
                    <TouchableOpacity style={styles.controlButton}
                                      onPress={this.pausePlaying}>
                        <FontAwesomeIcon color={'#b7bc1c'} size={25} icon={faPause}/>
                    </TouchableOpacity>
                    }
                    <TouchableOpacity style={styles.controlButton}
                                      onPress={this.stopPlaying}>
                        <FontAwesomeIcon color={'#942c2c'} size={25} icon={faStop}/>
                    </TouchableOpacity>
                </View>
                <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>{positionText} </Text>
                    <Text style={styles.timeText}>/</Text>
                    <Text style={styles.timeText}> {durationText}</Text>
                </View>
                <View style={styles.settingsContainer}>
                    <TouchableOpacity style={styles.controlButton}
                                      onPress={this.launchOptions}>
                        <FontAwesomeIcon color={'#0065ff'} size={25} icon={faSlidersH}/>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

}

const styles = StyleSheet.create({
    casterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        padding: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#cdcdcd',
    },
    controlContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
    },
    timeContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeText: {
        textAlign: 'center',
        color: '#646464',
    },
    settingsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlButton: {
        padding: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default CasterControl;
