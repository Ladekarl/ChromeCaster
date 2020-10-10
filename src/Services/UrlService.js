import psl from 'psl';

class UrlService {
    static blacklist = [];
    static whitelist = ['google.com'];

    static addToWhitelist(url) {
        if (UrlService.whitelist.indexOf(url) === -1) {
            UrlService.whitelist.push(url);
        }
    }

    static isWhitelistedUrl(url) {
        return UrlService.whitelist.indexOf(url) > -1;
    }

    static async loadBlacklist() {
        const response = await fetch('https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts');
        let text = await response.text();
        UrlService.blacklist = UrlService.parseBlacklistText(text);
        return UrlService.blacklist;
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
        const hostname = UrlService.extractHostname(url);
        return UrlService.isBlacklistedHostname(hostname);
    }

    static isBlacklistedHostname(hostname) {
        if (!UrlService.blacklist) {
            return false;
        }
        return UrlService.blacklist.indexOf(hostname) > -1;
    }

    static extractHostname(url) {
        if (!url) {
            return;
        }
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
        return psl.get(UrlService.extractHostname(url));
    }

    static parseUrl(url) {
        return UrlService.extractDomainName(url);
    }
}

export default UrlService;
