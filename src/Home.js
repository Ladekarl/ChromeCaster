import React, {Component} from 'react';
import {SafeAreaView, StyleSheet} from 'react-native';
import Browser from './Components/Browser';

class Home extends Component {
    render() {
        return (
            <SafeAreaView style={styles.container}>
                <Browser/>
            </SafeAreaView>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default Home;
