import psl from 'psl';

class BlacklistService {
    static blacklist = [];

    static async loadBlacklist() {
        const response = await fetch('https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts');
        let text = await response.text();
        this.blacklist = this.parseBlacklistText(text);
        return this.blacklist;
    }

    static parseBlacklistText(blacklistText) {
        const startSearch = '# http://stevenblack.com';
        const endSearch = '# End yoyo.org';
        const startIndex = blacklistText.indexOf(startSearch) + startSearch.length;
        const endIndex = blacklistText.indexOf(endSearch);
        let text = blacklistText.substring(startIndex, endIndex);
        text = text.replaceAll('0.0.0.0', '').trim();
        text = text.replace(/(\r\n|\n|\r)/gm, '');
        return text.split(' ');
    }

    static isBlacklistedUrl(url) {
        const hostname = this.extractHostname(url);
        return this.isBlacklistedHostname(hostname);
    }

    static isBlacklistedHostname(hostname) {
        if (!this.blacklist) {
            return false;
        }
        return this.blacklist.indexOf(hostname) > -1;
    }

    static extractHostname(url) {
        let hostname;
        if (url.indexOf('//') > -1) {
            hostname = url.split('/')[2];
        } else {
            hostname = url.split('/')[0];
        }
        hostname = hostname.split(':')[0];
        hostname = hostname.split('?')[0];
        return hostname;
    }

    static extractDomainName(url) {
        return psl.get(this.extractHostname(url));
    }
}

export default BlacklistService;
