module.exports = {
    "extends": "./node_modules/eslint-config-google/index.js",
    "parserOptions": {
        "ecmaVersion": 2017
    },
    "env": {
        "node": true,
        "es6": true
    },
    "rules": {
        "object-curly-spacing": 'off',
        "no-const-assign": "warn",
        "linebreak-style": 'off',
        "max-len": 'off',
        "require-jsdoc": 'off',
        "indent": ["error", "tab", {"SwitchCase": 1}],
        "no-tabs": 'off',
        "no-unreachable": 'error',
        "no-multi-spaces": 'off',
        "arrow-parens": 'off',
        "no-undef": "error",
        "prefer-const": "error"
    }
};