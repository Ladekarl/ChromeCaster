import React, {Component} from 'react';
import Browser from './Components/Browser';
import {ActivityIndicator, Platform, StatusBar, StyleSheet, View} from 'react-native';
import BlacklistService from './Services/BlacklistService';

class Home extends Component {

    constructor(props) {
        super(props);

        if (Platform.OS === 'android') {
            StatusBar.setBackgroundColor('#0065ff');
        }
        StatusBar.setBarStyle('light-content');

        this.state = {
            fetching: true,
        };
    }

    componentDidMount() {
        this.loadBlacklist();
    }

    loadBlacklist = () => {
        BlacklistService.loadBlacklist().then(() => {
            this.setState({
                fetching: false,
            });
        });
    };

    render() {
        const {fetching} = this.state;
        if (fetching) {
            return (
                <View style={styles.container}>
                    <View style={styles.activityContainer}>
                        <ActivityIndicator size={'large'} color={'#ffffff'}/>
                    </View>
                </View>
            );
        } else {
            return (
                <Browser/>
            );
        }
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0065ff',
    },
    activityContainer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default Home;
