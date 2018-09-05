function _defaults(obj, defaults) { var keys = Object.getOwnPropertyNames(defaults); for (var i = 0; i < keys.length; i++) { var key = keys[i]; var value = Object.getOwnPropertyDescriptor(defaults, key); if (value && value.configurable && obj[key] === undefined) { Object.defineProperty(obj, key, value); } } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : _defaults(subClass, superClass); }

import { Exception } from '@orbit/core';
export var InvalidServerResponse = function (_Exception) {
    _inherits(InvalidServerResponse, _Exception);

    function InvalidServerResponse(response) {
        _classCallCheck(this, InvalidServerResponse);

        var _this = _possibleConstructorReturn(this, _Exception.call(this, 'Invalid server response: ' + response));

        _this.response = response;
        return _this;
    }

    return InvalidServerResponse;
}(Exception);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9leGNlcHRpb25zLmpzIl0sIm5hbWVzIjpbIkV4Y2VwdGlvbiIsIkludmFsaWRTZXJ2ZXJSZXNwb25zZSIsInJlc3BvbnNlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBLFNBQVNBLFNBQVQsUUFBMEIsYUFBMUI7QUFDQSxXQUFhQyxxQkFBYjtBQUFBOztBQUNJLG1DQUFZQyxRQUFaLEVBQXNCO0FBQUE7O0FBQUEscURBQ2xCLG9EQUFrQ0EsUUFBbEMsQ0FEa0I7O0FBRWxCLGNBQUtBLFFBQUwsR0FBZ0JBLFFBQWhCO0FBRmtCO0FBR3JCOztBQUpMO0FBQUEsRUFBMkNGLFNBQTNDIiwiZmlsZSI6ImxpYi9leGNlcHRpb25zLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRXhjZXB0aW9uIH0gZnJvbSAnQG9yYml0L2NvcmUnO1xuZXhwb3J0IGNsYXNzIEludmFsaWRTZXJ2ZXJSZXNwb25zZSBleHRlbmRzIEV4Y2VwdGlvbiB7XG4gICAgY29uc3RydWN0b3IocmVzcG9uc2UpIHtcbiAgICAgICAgc3VwZXIoYEludmFsaWQgc2VydmVyIHJlc3BvbnNlOiAke3Jlc3BvbnNlfWApO1xuICAgICAgICB0aGlzLnJlc3BvbnNlID0gcmVzcG9uc2U7XG4gICAgfVxufSJdfQ==