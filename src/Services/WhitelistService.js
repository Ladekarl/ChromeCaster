class WhitelistService {
    static whitelist = ['google.com'];

    static addToWhitelist(url) {
        if (WhitelistService.whitelist.indexOf(url) === -1) {
            WhitelistService.whitelist.push(url);
        }
    }

    static isWhitelistedUrl(url) {
        return WhitelistService.whitelist.indexOf(url) > -1;
    }
}

export default WhitelistService;
