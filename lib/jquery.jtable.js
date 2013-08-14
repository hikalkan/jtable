/* @license

jTable 2.3.0
http://www.jtable.org

---------------------------------------------------------------------------

Copyright (C) 2011-2013 by Halil İbrahim Kalkan (http://www.halilibrahimkalkan.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/
/**********************************************************@preserve*****
* CORE jTable module                                                    *
*************************************************************************/
(function($) {
    $.widget("hik.jtable", {
        options: {
            actions: {},
            fields: {},
            animationsEnabled: true,
            defaultDateFormat: "yy-mm-dd",
            dialogShowEffect: "fade",
            dialogHideEffect: "fade",
            showCloseButton: false,
            loadingAnimationDelay: 500,
            saveUserPreferences: true,
            jqueryuiTheme: false,
            ajaxSettings: {
                type: "POST",
                dataType: "json"
            },
            toolbar: {
                hoverAnimation: true,
                hoverAnimationDuration: 60,
                hoverAnimationEasing: undefined,
                items: []
            },
            closeRequested: function(event, data) {},
            formCreated: function(event, data) {},
            formSubmitting: function(event, data) {},
            formClosed: function(event, data) {},
            loadingRecords: function(event, data) {},
            recordsLoaded: function(event, data) {},
            rowInserted: function(event, data) {},
            rowsRemoved: function(event, data) {},
            messages: {
                serverCommunicationError: "An error occured while communicating to the server.",
                loadingMessage: "Loading records...",
                noDataAvailable: "No data available!",
                areYouSure: "Are you sure?",
                save: "Save",
                saving: "Saving",
                cancel: "Cancel",
                error: "Error",
                close: "Close",
                cannotLoadOptionsFor: "Can not load options for field {0}"
            }
        },
        _$mainContainer: null,
        _$titleDiv: null,
        _$toolbarDiv: null,
        _$table: null,
        _$tableBody: null,
        _$tableRows: null,
        _$busyDiv: null,
        _$busyMessageDiv: null,
        _$errorDialogDiv: null,
        _columnList: null,
        _fieldList: null,
        _keyField: null,
        _firstDataColumnOffset: 0,
        _lastPostData: null,
        _cache: null,
        _create: function() {
            this._normalizeFieldsOptions();
            this._initializeFields();
            this._createFieldAndColumnList();
            this._createMainContainer();
            this._createTableTitle();
            this._createToolBar();
            this._createTable();
            this._createBusyPanel();
            this._createErrorDialogDiv();
            this._addNoDataRow();
            this._cookieKeyPrefix = this._generateCookieKeyPrefix();
        },
        _normalizeFieldsOptions: function() {
            var self = this;
            $.each(self.options.fields, function(fieldName, props) {
                self._normalizeFieldOptions(fieldName, props);
            });
        },
        _normalizeFieldOptions: function(fieldName, props) {
            if (props.listClass == undefined) {
                props.listClass = "";
            }
            if (props.inputClass == undefined) {
                props.inputClass = "";
            }
            if (props.dependsOn && $.type(props.dependsOn) === "string") {
                var dependsOnArray = props.dependsOn.split(",");
                props.dependsOn = [];
                for (var i = 0; i < dependsOnArray.length; i++) {
                    props.dependsOn.push($.trim(dependsOnArray[i]));
                }
            }
        },
        _initializeFields: function() {
            this._lastPostData = {};
            this._$tableRows = [];
            this._columnList = [];
            this._fieldList = [];
            this._cache = [];
        },
        _createFieldAndColumnList: function() {
            var self = this;
            $.each(self.options.fields, function(name, props) {
                self._fieldList.push(name);
                if (props.key == true) {
                    self._keyField = name;
                }
                if (props.list != false && props.type != "hidden") {
                    self._columnList.push(name);
                }
            });
        },
        _createMainContainer: function() {
            this._$mainContainer = $("<div />").addClass("jtable-main-container").appendTo(this.element);
            this._jqueryuiThemeAddClass(this._$mainContainer, "ui-widget");
        },
        _createTableTitle: function() {
            var self = this;
            if (!self.options.title) {
                return;
            }
            var $titleDiv = $("<div />").addClass("jtable-title").appendTo(self._$mainContainer);
            self._jqueryuiThemeAddClass($titleDiv, "ui-widget-header");
            $("<div />").addClass("jtable-title-text").appendTo($titleDiv).append(self.options.title);
            if (self.options.showCloseButton) {
                var $textSpan = $("<span />").html(self.options.messages.close);
                $("<button></button>").addClass("jtable-command-button jtable-close-button").attr("title", self.options.messages.close).append($textSpan).appendTo($titleDiv).click(function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    self._onCloseRequested();
                });
            }
            self._$titleDiv = $titleDiv;
        },
        _createTable: function() {
            this._$table = $("<table></table>").addClass("jtable").appendTo(this._$mainContainer);
            if (this.options.tableId) {
                this._$table.attr("id", this.options.tableId);
            }
            this._jqueryuiThemeAddClass(this._$table, "ui-widget-content");
            this._createTableHead();
            this._createTableBody();
        },
        _createTableHead: function() {
            var $thead = $("<thead></thead>").appendTo(this._$table);
            this._addRowToTableHead($thead);
        },
        _addRowToTableHead: function($thead) {
            var $tr = $("<tr></tr>").appendTo($thead);
            this._addColumnsToHeaderRow($tr);
        },
        _addColumnsToHeaderRow: function($tr) {
            for (var i = 0; i < this._columnList.length; i++) {
                var fieldName = this._columnList[i];
                var $headerCell = this._createHeaderCellForField(fieldName, this.options.fields[fieldName]);
                $headerCell.appendTo($tr);
            }
        },
        _createHeaderCellForField: function(fieldName, field) {
            field.width = field.width || "10%";
            var $headerTextSpan = $("<span />").addClass("jtable-column-header-text").html(field.title);
            var $headerContainerDiv = $("<div />").addClass("jtable-column-header-container").append($headerTextSpan);
            var $th = $("<th></th>").addClass("jtable-column-header").addClass(field.listClass).css("width", field.width).data("fieldName", fieldName).append($headerContainerDiv);
            this._jqueryuiThemeAddClass($th, "ui-state-default");
            return $th;
        },
        _createEmptyCommandHeader: function() {
            var $th = $("<th></th>").addClass("jtable-command-column-header").css("width", "1%");
            this._jqueryuiThemeAddClass($th, "ui-state-default");
            return $th;
        },
        _createTableBody: function() {
            this._$tableBody = $("<tbody></tbody>").appendTo(this._$table);
        },
        _createBusyPanel: function() {
            this._$busyMessageDiv = $("<div />").addClass("jtable-busy-message").prependTo(this._$mainContainer);
            this._$busyDiv = $("<div />").addClass("jtable-busy-panel-background").prependTo(this._$mainContainer);
            this._jqueryuiThemeAddClass(this._$busyMessageDiv, "ui-widget-header");
            this._hideBusy();
        },
        _createErrorDialogDiv: function() {
            var self = this;
            self._$errorDialogDiv = $("<div></div>").appendTo(self._$mainContainer);
            self._$errorDialogDiv.dialog({
                autoOpen: false,
                show: self.options.dialogShowEffect,
                hide: self.options.dialogHideEffect,
                modal: true,
                title: self.options.messages.error,
                buttons: [ {
                    text: self.options.messages.close,
                    click: function() {
                        self._$errorDialogDiv.dialog("close");
                    }
                } ]
            });
        },
        load: function(postData, completeCallback) {
            this._lastPostData = postData;
            this._reloadTable(completeCallback);
        },
        reload: function(completeCallback) {
            this._reloadTable(completeCallback);
        },
        getRowByKey: function(key) {
            for (var i = 0; i < this._$tableRows.length; i++) {
                if (key == this._getKeyValueOfRecord(this._$tableRows[i].data("record"))) {
                    return this._$tableRows[i];
                }
            }
            return null;
        },
        destroy: function() {
            this.element.empty();
            $.Widget.prototype.destroy.call(this);
        },
        _setOption: function(key, value) {},
        _reloadTable: function(completeCallback) {
            var self = this;
            self._showBusy(self.options.messages.loadingMessage, self.options.loadingAnimationDelay);
            var loadUrl = self._createRecordLoadUrl();
            self._onLoadingRecords();
            self._ajax({
                url: loadUrl,
                data: self._lastPostData,
                success: function(data) {
                    self._hideBusy();
                    if (data.Result != "OK") {
                        self._showError(data.Message);
                        return;
                    }
                    self._removeAllRows("reloading");
                    self._addRecordsToTable(data.Records);
                    self._onRecordsLoaded(data);
                    if (completeCallback) {
                        completeCallback();
                    }
                },
                error: function() {
                    self._hideBusy();
                    self._showError(self.options.messages.serverCommunicationError);
                }
            });
        },
        _createRecordLoadUrl: function() {
            return this.options.actions.listAction;
        },
        _createRowFromRecord: function(record) {
            var $tr = $("<tr></tr>").addClass("jtable-data-row").attr("data-record-key", this._getKeyValueOfRecord(record)).data("record", record);
            this._addCellsToRowUsingRecord($tr);
            return $tr;
        },
        _addCellsToRowUsingRecord: function($row) {
            var record = $row.data("record");
            for (var i = 0; i < this._columnList.length; i++) {
                this._createCellForRecordField(record, this._columnList[i]).appendTo($row);
            }
        },
        _createCellForRecordField: function(record, fieldName) {
            return $("<td></td>").addClass(this.options.fields[fieldName].listClass).append(this._getDisplayTextForRecordField(record, fieldName));
        },
        _addRecordsToTable: function(records) {
            var self = this;
            $.each(records, function(index, record) {
                self._addRow(self._createRowFromRecord(record));
            });
            self._refreshRowStyles();
        },
        _addRowToTable: function($tableRow, index, isNewRow, animationsEnabled) {
            var options = {
                index: this._normalizeNumber(index, 0, this._$tableRows.length, this._$tableRows.length)
            };
            if (isNewRow == true) {
                options.isNewRow = true;
            }
            if (animationsEnabled == false) {
                options.animationsEnabled = false;
            }
            this._addRow($tableRow, options);
        },
        _addRow: function($row, options) {
            options = $.extend({
                index: this._$tableRows.length,
                isNewRow: false,
                animationsEnabled: true
            }, options);
            if (this._$tableRows.length <= 0) {
                this._removeNoDataRow();
            }
            options.index = this._normalizeNumber(options.index, 0, this._$tableRows.length, this._$tableRows.length);
            if (options.index == this._$tableRows.length) {
                this._$tableBody.append($row);
                this._$tableRows.push($row);
            } else if (options.index == 0) {
                this._$tableBody.prepend($row);
                this._$tableRows.unshift($row);
            } else {
                this._$tableRows[options.index - 1].after($row);
                this._$tableRows.splice(options.index, 0, $row);
            }
            this._onRowInserted($row, options.isNewRow);
            if (options.isNewRow) {
                this._refreshRowStyles();
                if (this.options.animationsEnabled && options.animationsEnabled) {
                    this._showNewRowAnimation($row);
                }
            }
        },
        _showNewRowAnimation: function($tableRow) {
            var className = "jtable-row-created";
            if (this.options.jqueryuiTheme) {
                className = className + " ui-state-highlight";
            }
            $tableRow.addClass(className, "slow", "", function() {
                $tableRow.removeClass(className, 5e3);
            });
        },
        _removeRowsFromTable: function($rows, reason) {
            var self = this;
            if ($rows.length <= 0) {
                return;
            }
            $rows.addClass("jtable-row-removed").remove();
            $rows.each(function() {
                var index = self._findRowIndex($(this));
                if (index >= 0) {
                    self._$tableRows.splice(index, 1);
                }
            });
            self._onRowsRemoved($rows, reason);
            if (self._$tableRows.length == 0) {
                self._addNoDataRow();
            }
            self._refreshRowStyles();
        },
        _findRowIndex: function($row) {
            return this._findIndexInArray($row, this._$tableRows, function($row1, $row2) {
                return $row1.data("record") == $row2.data("record");
            });
        },
        _removeAllRows: function(reason) {
            if (this._$tableRows.length <= 0) {
                return;
            }
            var $rows = this._$tableBody.find("tr.jtable-data-row");
            this._$tableBody.empty();
            this._$tableRows = [];
            this._onRowsRemoved($rows, reason);
            this._addNoDataRow();
        },
        _addNoDataRow: function() {
            if (this._$tableBody.find(">tr.jtable-no-data-row").length > 0) {
                return;
            }
            var $tr = $("<tr></tr>").addClass("jtable-no-data-row").appendTo(this._$tableBody);
            var totalColumnCount = this._$table.find("thead th").length;
            $("<td></td>").attr("colspan", totalColumnCount).html(this.options.messages.noDataAvailable).appendTo($tr);
        },
        _removeNoDataRow: function() {
            this._$tableBody.find(".jtable-no-data-row").remove();
        },
        _refreshRowStyles: function() {
            for (var i = 0; i < this._$tableRows.length; i++) {
                if (i % 2 == 0) {
                    this._$tableRows[i].addClass("jtable-row-even");
                } else {
                    this._$tableRows[i].removeClass("jtable-row-even");
                }
            }
        },
        _getDisplayTextForRecordField: function(record, fieldName) {
            var field = this.options.fields[fieldName];
            var fieldValue = record[fieldName];
            if (field.display) {
                return field.display({
                    record: record
                });
            }
            if (field.type == "date") {
                return this._getDisplayTextForDateRecordField(field, fieldValue);
            } else if (field.type == "checkbox") {
                return this._getCheckBoxTextForFieldByValue(fieldName, fieldValue);
            } else if (field.options) {
                var options = this._getOptionsForField(fieldName, {
                    record: record,
                    value: fieldValue,
                    source: "list",
                    dependedValues: this._createDependedValuesUsingRecord(record, field.dependsOn)
                });
                return this._findOptionByValue(options, fieldValue).DisplayText;
            } else {
                return fieldValue;
            }
        },
        _createDependedValuesUsingRecord: function(record, dependsOn) {
            if (!dependsOn) {
                return {};
            }
            var dependedValues = {};
            for (var i = 0; i < dependsOn.length; i++) {
                dependedValues[dependsOn[i]] = record[dependsOn[i]];
            }
            return dependedValues;
        },
        _findOptionByValue: function(options, value) {
            for (var i = 0; i < options.length; i++) {
                if (options[i].Value == value) {
                    return options[i];
                }
            }
            return {};
        },
        _getDisplayTextForDateRecordField: function(field, fieldValue) {
            if (!fieldValue) {
                return "";
            }
            var displayFormat = field.displayFormat || this.options.defaultDateFormat;
            var date = this._parseDate(fieldValue);
            return $.datepicker.formatDate(displayFormat, date);
        },
        _getOptionsForField: function(fieldName, funcParams) {
            var field = this.options.fields[fieldName];
            var optionsSource = field.options;
            if ($.isFunction(optionsSource)) {
                funcParams = $.extend(true, {
                    _cacheCleared: false,
                    dependedValues: {},
                    clearCache: function() {
                        this._cacheCleared = true;
                    }
                }, funcParams);
                optionsSource = optionsSource(funcParams);
            }
            var options;
            if (typeof optionsSource == "string") {
                var cacheKey = "options_" + fieldName + "_" + optionsSource;
                if (funcParams._cacheCleared || !this._cache[cacheKey]) {
                    this._cache[cacheKey] = this._buildOptionsFromArray(this._downloadOptions(fieldName, optionsSource));
                    this._sortFieldOptions(this._cache[cacheKey], field.optionsSorting);
                } else {
                    if (funcParams.value != undefined) {
                        var optionForValue = this._findOptionByValue(this._cache[cacheKey], funcParams.value);
                        if (optionForValue.DisplayText == undefined) {
                            this._cache[cacheKey] = this._buildOptionsFromArray(this._downloadOptions(fieldName, optionsSource));
                            this._sortFieldOptions(this._cache[cacheKey], field.optionsSorting);
                        }
                    }
                }
                options = this._cache[cacheKey];
            } else if (jQuery.isArray(optionsSource)) {
                options = this._buildOptionsFromArray(optionsSource);
                this._sortFieldOptions(options, field.optionsSorting);
            } else {
                options = this._buildOptionsArrayFromObject(optionsSource);
                this._sortFieldOptions(options, field.optionsSorting);
            }
            return options;
        },
        _downloadOptions: function(fieldName, url) {
            var self = this;
            var options = [];
            self._ajax({
                url: url,
                async: false,
                success: function(data) {
                    if (data.Result != "OK") {
                        self._showError(data.Message);
                        return;
                    }
                    options = data.Options;
                },
                error: function() {
                    var errMessage = self._formatString(self.options.messages.cannotLoadOptionsFor, fieldName);
                    self._showError(errMessage);
                }
            });
            return options;
        },
        _sortFieldOptions: function(options, sorting) {
            if (!options || !options.length || !sorting) {
                return;
            }
            var dataSelector;
            if (sorting.indexOf("value") == 0) {
                dataSelector = function(option) {
                    return option.Value;
                };
            } else {
                dataSelector = function(option) {
                    return option.DisplayText;
                };
            }
            var compareFunc;
            if ($.type(dataSelector(options[0])) == "string") {
                compareFunc = function(option1, option2) {
                    return dataSelector(option1).localeCompare(dataSelector(option2));
                };
            } else {
                compareFunc = function(option1, option2) {
                    return dataSelector(option1) - dataSelector(option2);
                };
            }
            if (sorting.indexOf("desc") > 0) {
                options.sort(function(a, b) {
                    return compareFunc(b, a);
                });
            } else {
                options.sort(function(a, b) {
                    return compareFunc(a, b);
                });
            }
        },
        _buildOptionsArrayFromObject: function(options) {
            var list = [];
            $.each(options, function(propName, propValue) {
                list.push({
                    Value: propName,
                    DisplayText: propValue
                });
            });
            return list;
        },
        _buildOptionsFromArray: function(optionsArray) {
            var list = [];
            for (var i = 0; i < optionsArray.length; i++) {
                if ($.isPlainObject(optionsArray[i])) {
                    list.push(optionsArray[i]);
                } else {
                    list.push({
                        Value: optionsArray[i],
                        DisplayText: optionsArray[i]
                    });
                }
            }
            return list;
        },
        _parseDate: function(dateString) {
            if (dateString.indexOf("Date") >= 0) {
                return new Date(parseInt(dateString.substr(6), 10));
            } else if (dateString.length == 10) {
                return new Date(parseInt(dateString.substr(0, 4), 10), parseInt(dateString.substr(5, 2), 10) - 1, parseInt(dateString.substr(8, 2), 10));
            } else if (dateString.length == 19) {
                return new Date(parseInt(dateString.substr(0, 4), 10), parseInt(dateString.substr(5, 2), 10) - 1, parseInt(dateString.substr(8, 2, 10)), parseInt(dateString.substr(11, 2), 10), parseInt(dateString.substr(14, 2), 10), parseInt(dateString.substr(17, 2), 10));
            } else {
                this._logWarn("Given date is not properly formatted: " + dateString);
                return "format error!";
            }
        },
        _createToolBar: function() {
            this._$toolbarDiv = $("<div />").addClass("jtable-toolbar").appendTo(this._$titleDiv);
            for (var i = 0; i < this.options.toolbar.items.length; i++) {
                this._addToolBarItem(this.options.toolbar.items[i]);
            }
        },
        _addToolBarItem: function(item) {
            if (item == undefined || item.text == undefined && item.icon == undefined) {
                this._logWarn("Can not add tool bar item since it is not valid!");
                this._logWarn(item);
                return null;
            }
            var $toolBarItem = $("<span></span>").addClass("jtable-toolbar-item").appendTo(this._$toolbarDiv);
            this._jqueryuiThemeAddClass($toolBarItem, "ui-widget ui-state-default ui-corner-all", "ui-state-hover");
            if (item.cssClass) {
                $toolBarItem.addClass(item.cssClass);
            }
            if (item.tooltip) {
                $toolBarItem.attr("title", item.tooltip);
            }
            if (item.icon) {
                var $icon = $('<span class="jtable-toolbar-item-icon"></span>').appendTo($toolBarItem);
                if (item.icon === true) {} else if ($.type(item.icon === "string")) {
                    $icon.css("background", 'url("' + item.icon + '")');
                }
            }
            if (item.text) {
                $('<span class=""></span>').html(item.text).addClass("jtable-toolbar-item-text").appendTo($toolBarItem);
            }
            if (item.click) {
                $toolBarItem.click(function() {
                    item.click();
                });
            }
            var hoverAnimationDuration = undefined;
            var hoverAnimationEasing = undefined;
            if (this.options.toolbar.hoverAnimation) {
                hoverAnimationDuration = this.options.toolbar.hoverAnimationDuration;
                hoverAnimationEasing = this.options.toolbar.hoverAnimationEasing;
            }
            $toolBarItem.hover(function() {
                $toolBarItem.addClass("jtable-toolbar-item-hover", hoverAnimationDuration, hoverAnimationEasing);
            }, function() {
                $toolBarItem.removeClass("jtable-toolbar-item-hover", hoverAnimationDuration, hoverAnimationEasing);
            });
            return $toolBarItem;
        },
        _showError: function(message) {
            this._$errorDialogDiv.html(message).dialog("open");
        },
        _setBusyTimer: null,
        _showBusy: function(message, delay) {
            var self = this;
            self._$busyDiv.width(self._$mainContainer.width()).height(self._$mainContainer.height()).addClass("jtable-busy-panel-background-invisible").show();
            var makeVisible = function() {
                self._$busyDiv.removeClass("jtable-busy-panel-background-invisible");
                self._$busyMessageDiv.html(message).show();
            };
            if (delay) {
                if (self._setBusyTimer) {
                    return;
                }
                self._setBusyTimer = setTimeout(makeVisible, delay);
            } else {
                makeVisible();
            }
        },
        _hideBusy: function() {
            clearTimeout(this._setBusyTimer);
            this._setBusyTimer = null;
            this._$busyDiv.hide();
            this._$busyMessageDiv.html("").hide();
        },
        _isBusy: function() {
            return this._$busyMessageDiv.is(":visible");
        },
        _jqueryuiThemeAddClass: function($elm, className, hoverClassName) {
            if (!this.options.jqueryuiTheme) {
                return;
            }
            $elm.addClass(className);
            if (hoverClassName) {
                $elm.hover(function() {
                    $elm.addClass(hoverClassName);
                }, function() {
                    $elm.removeClass(hoverClassName);
                });
            }
        },
        _performAjaxCall: function(url, postData, async, success, error) {
            this._ajax({
                url: url,
                data: postData,
                async: async,
                success: success,
                error: error
            });
        },
        _ajax: function(options) {
            var opts = $.extend({}, this.options.ajaxSettings, options);
            opts.success = function(data) {
                if (options.success) {
                    options.success(data);
                }
            };
            opts.error = function() {
                if (options.error) {
                    options.error();
                }
            };
            opts.complete = function() {
                if (options.complete) {
                    options.complete();
                }
            };
            $.ajax(opts);
        },
        _getKeyValueOfRecord: function(record) {
            return record[this._keyField];
        },
        _setCookie: function(key, value) {
            key = this._cookieKeyPrefix + key;
            var expireDate = new Date();
            expireDate.setDate(expireDate.getDate() + 30);
            document.cookie = encodeURIComponent(key) + "=" + encodeURIComponent(value) + "; expires=" + expireDate.toUTCString();
        },
        _getCookie: function(key) {
            key = this._cookieKeyPrefix + key;
            var equalities = document.cookie.split("; ");
            for (var i = 0; i < equalities.length; i++) {
                if (!equalities[i]) {
                    continue;
                }
                var splitted = equalities[i].split("=");
                if (splitted.length != 2) {
                    continue;
                }
                if (decodeURIComponent(splitted[0]) === key) {
                    return decodeURIComponent(splitted[1] || "");
                }
            }
            return null;
        },
        _generateCookieKeyPrefix: function() {
            var simpleHash = function(value) {
                var hash = 0;
                if (value.length == 0) {
                    return hash;
                }
                for (var i = 0; i < value.length; i++) {
                    var ch = value.charCodeAt(i);
                    hash = (hash << 5) - hash + ch;
                    hash = hash & hash;
                }
                return hash;
            };
            var strToHash = "";
            if (this.options.tableId) {
                strToHash = strToHash + this.options.tableId + "#";
            }
            strToHash = strToHash + this._columnList.join("$") + "#c" + this._$table.find("thead th").length;
            return "jtable#" + simpleHash(strToHash);
        },
        _onLoadingRecords: function() {
            this._trigger("loadingRecords", null, {});
        },
        _onRecordsLoaded: function(data) {
            this._trigger("recordsLoaded", null, {
                records: data.Records,
                serverResponse: data
            });
        },
        _onRowInserted: function($row, isNewRow) {
            this._trigger("rowInserted", null, {
                row: $row,
                record: $row.data("record"),
                isNewRow: isNewRow
            });
        },
        _onRowsRemoved: function($rows, reason) {
            this._trigger("rowsRemoved", null, {
                rows: $rows,
                reason: reason
            });
        },
        _onCloseRequested: function() {
            this._trigger("closeRequested", null, {});
        }
    });
})(jQuery);

/**********************************************************@preserve*****
* Some UTULITY methods used by jTable                                   *
*************************************************************************/
(function($) {
    $.extend(true, $.hik.jtable.prototype, {
        _getPropertyOfObject: function(obj, propName) {
            if (propName.indexOf(".") < 0) {
                return obj[propName];
            } else {
                var preDot = propName.substring(0, propName.indexOf("."));
                var postDot = propName.substring(propName.indexOf(".") + 1);
                return this._getPropertyOfObject(obj[preDot], postDot);
            }
        },
        _setPropertyOfObject: function(obj, propName, value) {
            if (propName.indexOf(".") < 0) {
                obj[propName] = value;
            } else {
                var preDot = propName.substring(0, propName.indexOf("."));
                var postDot = propName.substring(propName.indexOf(".") + 1);
                this._setPropertyOfObject(obj[preDot], postDot, value);
            }
        },
        _insertToArrayIfDoesNotExists: function(array, value) {
            if ($.inArray(value, array) < 0) {
                array.push(value);
            }
        },
        _findIndexInArray: function(value, array, compareFunc) {
            if (!compareFunc) {
                compareFunc = function(a, b) {
                    return a == b;
                };
            }
            for (var i = 0; i < array.length; i++) {
                if (compareFunc(value, array[i])) {
                    return i;
                }
            }
            return -1;
        },
        _normalizeNumber: function(number, min, max, defaultValue) {
            if (number == undefined || number == null || isNaN(number)) {
                return defaultValue;
            }
            if (number < min) {
                return min;
            }
            if (number > max) {
                return max;
            }
            return number;
        },
        _formatString: function() {
            if (arguments.length == 0) {
                return null;
            }
            var str = arguments[0];
            for (var i = 1; i < arguments.length; i++) {
                var placeHolder = "{" + (i - 1) + "}";
                str = str.replace(placeHolder, arguments[i]);
            }
            return str;
        },
        _logDebug: function(text) {
            if (!window.console) {
                return;
            }
            console.log("jTable DEBUG: " + text);
        },
        _logInfo: function(text) {
            if (!window.console) {
                return;
            }
            console.log("jTable INFO: " + text);
        },
        _logWarn: function(text) {
            if (!window.console) {
                return;
            }
            console.log("jTable WARNING: " + text);
        },
        _logError: function(text) {
            if (!window.console) {
                return;
            }
            console.log("jTable ERROR: " + text);
        }
    });
    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function(elt) {
            var len = this.length;
            var from = Number(arguments[1]) || 0;
            from = from < 0 ? Math.ceil(from) : Math.floor(from);
            if (from < 0) from += len;
            for (;from < len; from++) {
                if (from in this && this[from] === elt) return from;
            }
            return -1;
        };
    }
})(jQuery);

/**********************************************************@preserve*****
* FORMS extension for jTable (base for edit/create forms)               *
*************************************************************************/
(function($) {
    $.extend(true, $.hik.jtable.prototype, {
        _submitFormUsingAjax: function(url, formData, success, error) {
            this._ajax({
                url: url,
                data: formData,
                success: success,
                error: error
            });
        },
        _createInputLabelForRecordField: function(fieldName) {
            return $("<div />").addClass("jtable-input-label").html(this.options.fields[fieldName].inputTitle || this.options.fields[fieldName].title);
        },
        _createInputForRecordField: function(funcParams) {
            var fieldName = funcParams.fieldName, value = funcParams.value, record = funcParams.record, formType = funcParams.formType, form = funcParams.form;
            var field = this.options.fields[fieldName];
            if (value == undefined || value == null) {
                value = field.defaultValue;
            }
            if (field.input) {
                var $input = $(field.input({
                    value: value,
                    record: record,
                    formType: formType,
                    form: form
                }));
                if (!$input.attr("id")) {
                    $input.attr("id", "Edit-" + fieldName);
                }
                return $("<div />").addClass("jtable-input jtable-custom-input").append($input);
            }
            if (field.inputName) {
                fieldName = field.inputName;
            }
            if (field.type == "date") {
                return this._createDateInputForField(field, fieldName, value);
            } else if (field.type == "textarea") {
                return this._createTextAreaForField(field, fieldName, value);
            } else if (field.type == "password") {
                return this._createPasswordInputForField(field, fieldName, value);
            } else if (field.type == "checkbox") {
                return this._createCheckboxForField(field, fieldName, value);
            } else if (field.options) {
                if (field.type == "radiobutton") {
                    return this._createRadioButtonListForField(field, fieldName, value, record, formType);
                } else {
                    return this._createDropDownListForField(field, fieldName, value, record, formType, form);
                }
            } else {
                return this._createTextInputForField(field, fieldName, value);
            }
        },
        _createInputForHidden: function(fieldName, value) {
            if (value == undefined) {
                value = "";
            }
            return $('<input type="hidden" name="' + fieldName + '" id="Edit-' + fieldName + '"></input>').val(value);
        },
        _createDateInputForField: function(field, fieldName, value) {
            var $input = $('<input class="' + field.inputClass + '" id="Edit-' + fieldName + '" type="text" name="' + fieldName + '"></input>');
            if (value != undefined) {
                $input.val(value);
            }
            var displayFormat = field.displayFormat || this.options.defaultDateFormat;
            $input.datepicker({
                dateFormat: displayFormat
            });
            return $("<div />").addClass("jtable-input jtable-date-input").append($input);
        },
        _createTextAreaForField: function(field, fieldName, value) {
            var $textArea = $('<textarea class="' + field.inputClass + '" id="Edit-' + fieldName + '" name="' + fieldName + '"></textarea>');
            if (value != undefined) {
                $textArea.val(value);
            }
            return $("<div />").addClass("jtable-input jtable-textarea-input").append($textArea);
        },
        _createTextInputForField: function(field, fieldName, value) {
            var $input = $('<input class="' + field.inputClass + '" id="Edit-' + fieldName + '" type="text" name="' + fieldName + '"></input>');
            if (value != undefined) {
                $input.val(value);
            }
            return $("<div />").addClass("jtable-input jtable-text-input").append($input);
        },
        _createPasswordInputForField: function(field, fieldName, value) {
            var $input = $('<input class="' + field.inputClass + '" id="Edit-' + fieldName + '" type="password" name="' + fieldName + '"></input>');
            if (value != undefined) {
                $input.val(value);
            }
            return $("<div />").addClass("jtable-input jtable-password-input").append($input);
        },
        _createCheckboxForField: function(field, fieldName, value) {
            var self = this;
            if (value == undefined) {
                value = self._getCheckBoxPropertiesForFieldByState(fieldName, false).Value;
            }
            var $containerDiv = $("<div />").addClass("jtable-input jtable-checkbox-input");
            var $checkBox = $('<input class="' + field.inputClass + '" id="Edit-' + fieldName + '" type="checkbox" name="' + fieldName + '" />').appendTo($containerDiv);
            if (value != undefined) {
                $checkBox.val(value);
            }
            var $textSpan = $("<span>" + (field.formText || self._getCheckBoxTextForFieldByValue(fieldName, value)) + "</span>").appendTo($containerDiv);
            if (self._getIsCheckBoxSelectedForFieldByValue(fieldName, value)) {
                $checkBox.attr("checked", "checked");
            }
            var refreshCheckBoxValueAndText = function() {
                var checkboxProps = self._getCheckBoxPropertiesForFieldByState(fieldName, $checkBox.is(":checked"));
                $checkBox.attr("value", checkboxProps.Value);
                $textSpan.html(field.formText || checkboxProps.DisplayText);
            };
            $checkBox.click(function() {
                refreshCheckBoxValueAndText();
            });
            if (field.setOnTextClick != false) {
                $textSpan.addClass("jtable-option-text-clickable").click(function() {
                    if ($checkBox.is(":checked")) {
                        $checkBox.attr("checked", false);
                    } else {
                        $checkBox.attr("checked", true);
                    }
                    refreshCheckBoxValueAndText();
                });
            }
            return $containerDiv;
        },
        _createDropDownListForField: function(field, fieldName, value, record, source, form) {
            var $containerDiv = $("<div />").addClass("jtable-input jtable-dropdown-input");
            var $select = $('<select class="' + field.inputClass + '" id="Edit-' + fieldName + '" name="' + fieldName + '"></select>').appendTo($containerDiv);
            var options = this._getOptionsForField(fieldName, {
                record: record,
                source: source,
                form: form,
                dependedValues: this._createDependedValuesUsingForm(form, field.dependsOn)
            });
            this._fillDropDownListWithOptions($select, options, value);
            return $containerDiv;
        },
        _fillDropDownListWithOptions: function($select, options, value) {
            $select.empty();
            for (var i = 0; i < options.length; i++) {
                $("<option" + (options[i].Value == value ? ' selected="selected"' : "") + ">" + options[i].DisplayText + "</option>").val(options[i].Value).appendTo($select);
            }
        },
        _createDependedValuesUsingForm: function($form, dependsOn) {
            if (!dependsOn) {
                return {};
            }
            var dependedValues = {};
            for (var i = 0; i < dependsOn.length; i++) {
                var dependedField = dependsOn[i];
                var $dependsOn = $form.find("select[name=" + dependedField + "]");
                if ($dependsOn.length <= 0) {
                    continue;
                }
                dependedValues[dependedField] = $dependsOn.val();
            }
            return dependedValues;
        },
        _createRadioButtonListForField: function(field, fieldName, value, record, source) {
            var $containerDiv = $("<div />").addClass("jtable-input jtable-radiobuttonlist-input");
            var options = this._getOptionsForField(fieldName, {
                record: record,
                source: source
            });
            $.each(options, function(i, option) {
                var $radioButtonDiv = $('<div class=""></div>').addClass("jtable-radio-input").appendTo($containerDiv);
                var $radioButton = $('<input type="radio" id="Edit-' + fieldName + "-" + i + '" class="' + field.inputClass + '" name="' + fieldName + '"' + (option.Value == value + "" ? ' checked="true"' : "") + " />").val(option.Value).appendTo($radioButtonDiv);
                var $textSpan = $("<span></span>").html(option.DisplayText).appendTo($radioButtonDiv);
                if (field.setOnTextClick != false) {
                    $textSpan.addClass("jtable-option-text-clickable").click(function() {
                        if (!$radioButton.is(":checked")) {
                            $radioButton.attr("checked", true);
                        }
                    });
                }
            });
            return $containerDiv;
        },
        _getCheckBoxTextForFieldByValue: function(fieldName, value) {
            return this.options.fields[fieldName].values[value];
        },
        _getIsCheckBoxSelectedForFieldByValue: function(fieldName, value) {
            return this._createCheckBoxStateArrayForFieldWithCaching(fieldName)[1].Value.toString() == value.toString();
        },
        _getCheckBoxPropertiesForFieldByState: function(fieldName, checked) {
            return this._createCheckBoxStateArrayForFieldWithCaching(fieldName)[checked ? 1 : 0];
        },
        _createCheckBoxStateArrayForFieldWithCaching: function(fieldName) {
            var cacheKey = "checkbox_" + fieldName;
            if (!this._cache[cacheKey]) {
                this._cache[cacheKey] = this._createCheckBoxStateArrayForField(fieldName);
            }
            return this._cache[cacheKey];
        },
        _createCheckBoxStateArrayForField: function(fieldName) {
            var stateArray = [];
            var currentIndex = 0;
            $.each(this.options.fields[fieldName].values, function(propName, propValue) {
                if (currentIndex++ < 2) {
                    stateArray.push({
                        Value: propName,
                        DisplayText: propValue
                    });
                }
            });
            return stateArray;
        },
        _makeCascadeDropDowns: function($form, record, source) {
            var self = this;
            $form.find("select").each(function() {
                var $thisDropdown = $(this);
                var fieldName = $thisDropdown.attr("name");
                if (!fieldName) {
                    return;
                }
                var field = self.options.fields[fieldName];
                if (!field.dependsOn) {
                    return;
                }
                $.each(field.dependsOn, function(index, dependsOnField) {
                    var $dependsOnDropdown = $form.find("select[name=" + dependsOnField + "]");
                    $dependsOnDropdown.change(function() {
                        var funcParams = {
                            record: record,
                            source: source,
                            form: $form,
                            dependedValues: {}
                        };
                        funcParams.dependedValues = self._createDependedValuesUsingForm($form, field.dependsOn);
                        var options = self._getOptionsForField(fieldName, funcParams);
                        self._fillDropDownListWithOptions($thisDropdown, options, undefined);
                        $thisDropdown.change();
                    });
                });
            });
        },
        _updateRecordValuesFromForm: function(record, $form) {
            for (var i = 0; i < this._fieldList.length; i++) {
                var fieldName = this._fieldList[i];
                var field = this.options.fields[fieldName];
                if (field.edit == false) {
                    continue;
                }
                var $inputElement = $form.find('[name="' + fieldName + '"]');
                if ($inputElement.length <= 0) {
                    continue;
                }
                if (field.type == "date") {
                    var dateVal = $inputElement.val();
                    if (dateVal) {
                        var displayFormat = field.displayFormat || this.options.defaultDateFormat;
                        try {
                            var date = $.datepicker.parseDate(displayFormat, dateVal);
                            record[fieldName] = "/Date(" + date.getTime() + ")/";
                        } catch (e) {
                            this._logWarn("Date format is incorrect for field " + fieldName + ": " + dateVal);
                            record[fieldName] = undefined;
                        }
                    } else {
                        this._logDebug("Date is empty for " + fieldName);
                        record[fieldName] = undefined;
                    }
                } else if (field.options && field.type == "radiobutton") {
                    var $checkedElement = $inputElement.filter(":checked");
                    if ($checkedElement.length) {
                        record[fieldName] = $checkedElement.val();
                    } else {
                        record[fieldName] = undefined;
                    }
                } else {
                    record[fieldName] = $inputElement.val();
                }
            }
        },
        _setEnabledOfDialogButton: function($button, enabled, buttonText) {
            if (!$button) {
                return;
            }
            if (enabled != false) {
                $button.removeAttr("disabled").removeClass("ui-state-disabled");
            } else {
                $button.attr("disabled", "disabled").addClass("ui-state-disabled");
            }
            if (buttonText) {
                $button.find("span").text(buttonText);
            }
        }
    });
})(jQuery);

/**********************************************************@preserve*****
* CREATE RECORD extension for jTable                                    *
*************************************************************************/
(function($) {
    var base = {
        _create: $.hik.jtable.prototype._create
    };
    $.extend(true, $.hik.jtable.prototype, {
        options: {
            recordAdded: function(event, data) {},
            messages: {
                addNewRecord: "Add new record"
            }
        },
        _$addRecordDiv: null,
        _create: function() {
            base._create.apply(this, arguments);
            this._createAddRecordDialogDiv();
        },
        _createAddRecordDialogDiv: function() {
            var self = this;
            if (!self.options.actions.createAction) {
                return;
            }
            self._$addRecordDiv = $("<div />").appendTo(self._$mainContainer);
            self._$addRecordDiv.dialog({
                autoOpen: false,
                show: self.options.dialogShowEffect,
                hide: self.options.dialogHideEffect,
                width: "auto",
                minWidth: "300",
                modal: true,
                title: self.options.messages.addNewRecord,
                buttons: [ {
                    text: self.options.messages.cancel,
                    click: function() {
                        self._$addRecordDiv.dialog("close");
                    }
                }, {
                    id: "AddRecordDialogSaveButton",
                    text: self.options.messages.save,
                    click: function() {
                        var $saveButton = $("#AddRecordDialogSaveButton");
                        var $addRecordForm = self._$addRecordDiv.find("form");
                        if (self._trigger("formSubmitting", null, {
                            form: $addRecordForm,
                            formType: "create"
                        }) != false) {
                            self._setEnabledOfDialogButton($saveButton, false, self.options.messages.saving);
                            self._saveAddRecordForm($addRecordForm, $saveButton);
                        }
                    }
                } ],
                close: function() {
                    var $addRecordForm = self._$addRecordDiv.find("form").first();
                    var $saveButton = $("#AddRecordDialogSaveButton");
                    self._trigger("formClosed", null, {
                        form: $addRecordForm,
                        formType: "create"
                    });
                    self._setEnabledOfDialogButton($saveButton, true, self.options.messages.save);
                    $addRecordForm.remove();
                }
            });
            if (self.options.addRecordButton) {
                self.options.addRecordButton.click(function(e) {
                    e.preventDefault();
                    self._showAddRecordForm();
                });
            } else {
                self._addToolBarItem({
                    icon: true,
                    cssClass: "jtable-toolbar-item-add-record",
                    text: self.options.messages.addNewRecord,
                    click: function() {
                        self._showAddRecordForm();
                    }
                });
            }
        },
        showCreateForm: function() {
            this._showAddRecordForm();
        },
        addRecord: function(options) {
            var self = this;
            options = $.extend({
                clientOnly: false,
                animationsEnabled: self.options.animationsEnabled,
                url: self.options.actions.createAction,
                success: function() {},
                error: function() {}
            }, options);
            if (!options.record) {
                self._logWarn("options parameter in addRecord method must contain a record property.");
                return;
            }
            if (options.clientOnly) {
                self._addRow(self._createRowFromRecord(options.record), {
                    isNewRow: true,
                    animationsEnabled: options.animationsEnabled
                });
                options.success();
                return;
            }
            self._submitFormUsingAjax(options.url, $.param(options.record), function(data) {
                if (data.Result != "OK") {
                    self._showError(data.Message);
                    options.error(data);
                    return;
                }
                if (!data.Record) {
                    self._logError("Server must return the created Record object.");
                    options.error(data);
                    return;
                }
                self._onRecordAdded(data);
                self._addRow(self._createRowFromRecord(data.Record), {
                    isNewRow: true,
                    animationsEnabled: options.animationsEnabled
                });
                options.success(data);
            }, function() {
                self._showError(self.options.messages.serverCommunicationError);
                options.error();
            });
        },
        _showAddRecordForm: function() {
            var self = this;
            var $addRecordForm = $('<form id="jtable-create-form" class="jtable-dialog-form jtable-create-form" action="' + self.options.actions.createAction + '" method="POST"></form>');
            for (var i = 0; i < self._fieldList.length; i++) {
                var fieldName = self._fieldList[i];
                var field = self.options.fields[fieldName];
                if (field.key == true && field.create != true) {
                    continue;
                }
                if (field.create == false) {
                    continue;
                }
                if (field.createHidden == true) {
                    var hiddenVal = "";
                    if (field.defaultValue == undefined || field.defaultValue == null) {
                        hiddenVal = self._getValueForRecordField(record, fieldName);
                    } else {
                        hiddenVal = field.defaultValue;
                    }
                    $editForm.append(self._createInputForHidden(fieldName, hiddenVal));
                    continue;
                }
                var $fieldContainer = $("<div />").addClass("jtable-input-field-container").appendTo($addRecordForm);
                $fieldContainer.append(self._createInputLabelForRecordField(fieldName));
                $fieldContainer.append(self._createInputForRecordField({
                    fieldName: fieldName,
                    formType: "create",
                    form: $addRecordForm
                }));
            }
            self._makeCascadeDropDowns($addRecordForm, undefined, "create");
            self._$addRecordDiv.append($addRecordForm).dialog("open");
            self._trigger("formCreated", null, {
                form: $addRecordForm,
                formType: "create"
            });
        },
        _saveAddRecordForm: function($addRecordForm, $saveButton) {
            var self = this;
            $addRecordForm.data("submitting", true);
            self._submitFormUsingAjax($addRecordForm.attr("action"), $addRecordForm.serialize(), function(data) {
                if (data.Result != "OK") {
                    self._showError(data.Message);
                    self._setEnabledOfDialogButton($saveButton, true, self.options.messages.save);
                    return;
                }
                if (!data.Record) {
                    self._logError("Server must return the created Record object.");
                    self._setEnabledOfDialogButton($saveButton, true, self.options.messages.save);
                    return;
                }
                self._onRecordAdded(data);
                self._addRow(self._createRowFromRecord(data.Record), {
                    isNewRow: true
                });
                self._$addRecordDiv.dialog("close");
            }, function() {
                self._showError(self.options.messages.serverCommunicationError);
                self._setEnabledOfDialogButton($saveButton, true, self.options.messages.save);
            });
        },
        _onRecordAdded: function(data) {
            this._trigger("recordAdded", null, {
                record: data.Record,
                serverResponse: data
            });
        }
    });
})(jQuery);

/**********************************************************@preserve*****
* EDIT RECORD extension for jTable                                      *
*************************************************************************/
(function($) {
    var base = {
        _create: $.hik.jtable.prototype._create,
        _addColumnsToHeaderRow: $.hik.jtable.prototype._addColumnsToHeaderRow,
        _addCellsToRowUsingRecord: $.hik.jtable.prototype._addCellsToRowUsingRecord
    };
    $.extend(true, $.hik.jtable.prototype, {
        options: {
            recordUpdated: function(event, data) {},
            rowUpdated: function(event, data) {},
            messages: {
                editRecord: "Edit Record"
            }
        },
        _$editDiv: null,
        _$editingRow: null,
        _create: function() {
            base._create.apply(this, arguments);
            this._createEditDialogDiv();
        },
        _createEditDialogDiv: function() {
            var self = this;
            self._$editDiv = $("<div></div>").appendTo(self._$mainContainer);
            self._$editDiv.dialog({
                autoOpen: false,
                show: self.options.dialogShowEffect,
                hide: self.options.dialogHideEffect,
                width: "auto",
                minWidth: "300",
                modal: true,
                title: self.options.messages.editRecord,
                buttons: [ {
                    text: self.options.messages.cancel,
                    click: function() {
                        self._$editDiv.dialog("close");
                    }
                }, {
                    id: "EditDialogSaveButton",
                    text: self.options.messages.save,
                    click: function() {
                        if (self._$editingRow.hasClass("jtable-row-removed")) {
                            self._$editDiv.dialog("close");
                            return;
                        }
                        var $saveButton = self._$editDiv.find("#EditDialogSaveButton");
                        var $editForm = self._$editDiv.find("form");
                        if (self._trigger("formSubmitting", null, {
                            form: $editForm,
                            formType: "edit",
                            row: self._$editingRow
                        }) != false) {
                            self._setEnabledOfDialogButton($saveButton, false, self.options.messages.saving);
                            self._saveEditForm($editForm, $saveButton);
                        }
                    }
                } ],
                close: function() {
                    var $editForm = self._$editDiv.find("form:first");
                    var $saveButton = $("#EditDialogSaveButton");
                    self._trigger("formClosed", null, {
                        form: $editForm,
                        formType: "edit",
                        row: self._$editingRow
                    });
                    self._setEnabledOfDialogButton($saveButton, true, self.options.messages.save);
                    $editForm.remove();
                }
            });
        },
        updateRecord: function(options) {
            var self = this;
            options = $.extend({
                clientOnly: false,
                animationsEnabled: self.options.animationsEnabled,
                url: self.options.actions.updateAction,
                success: function() {},
                error: function() {}
            }, options);
            if (!options.record) {
                self._logWarn("options parameter in updateRecord method must contain a record property.");
                return;
            }
            var key = self._getKeyValueOfRecord(options.record);
            if (key == undefined || key == null) {
                self._logWarn("options parameter in updateRecord method must contain a record that contains the key field property.");
                return;
            }
            var $updatingRow = self.getRowByKey(key);
            if ($updatingRow == null) {
                self._logWarn("Can not found any row by key: " + key);
                return;
            }
            if (options.clientOnly) {
                $.extend($updatingRow.data("record"), options.record);
                self._updateRowTexts($updatingRow);
                self._onRecordUpdated($updatingRow, null);
                if (options.animationsEnabled) {
                    self._showUpdateAnimationForRow($updatingRow);
                }
                options.success();
                return;
            }
            self._submitFormUsingAjax(options.url, $.param(options.record), function(data) {
                if (data.Result != "OK") {
                    self._showError(data.Message);
                    options.error(data);
                    return;
                }
                $.extend($updatingRow.data("record"), options.record);
                self._updateRecordValuesFromServerResponse($updatingRow.data("record"), data);
                self._updateRowTexts($updatingRow);
                self._onRecordUpdated($updatingRow, data);
                if (options.animationsEnabled) {
                    self._showUpdateAnimationForRow($updatingRow);
                }
                options.success(data);
            }, function() {
                self._showError(self.options.messages.serverCommunicationError);
                options.error();
            });
        },
        _addColumnsToHeaderRow: function($tr) {
            base._addColumnsToHeaderRow.apply(this, arguments);
            if (this.options.actions.updateAction != undefined) {
                $tr.append(this._createEmptyCommandHeader());
            }
        },
        _addCellsToRowUsingRecord: function($row) {
            var self = this;
            base._addCellsToRowUsingRecord.apply(this, arguments);
            if (self.options.actions.updateAction != undefined) {
                var $span = $("<span></span>").html(self.options.messages.editRecord);
                var $button = $('<button title="' + self.options.messages.editRecord + '"></button>').addClass("jtable-command-button jtable-edit-command-button").append($span).click(function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    self._showEditForm($row);
                });
                $("<td></td>").addClass("jtable-command-column").append($button).appendTo($row);
            }
        },
        _showEditForm: function($tableRow) {
            var self = this;
            var record = $tableRow.data("record");
            var $editForm = $('<form id="jtable-edit-form" class="jtable-dialog-form jtable-edit-form" action="' + self.options.actions.updateAction + '" method="POST"></form>');
            for (var i = 0; i < self._fieldList.length; i++) {
                var fieldName = self._fieldList[i];
                var field = self.options.fields[fieldName];
                var fieldValue = record[fieldName];
                if (field.key == true) {
                    if (field.edit != true) {
                        $editForm.append(self._createInputForHidden(fieldName, fieldValue));
                        continue;
                    } else {
                        $editForm.append(self._createInputForHidden("jtRecordKey", fieldValue));
                    }
                }
                if (field.edit == false) {
                    continue;
                }
                if (field.editHidden == true) {
                    var hiddenVal = "";
                    if (field.defaultValue == undefined || field.defaultValue == null) {
                        hiddenVal = self._getValueForRecordField(record, fieldName);
                    } else {
                        hiddenVal = field.defaultValue;
                    }
                    $editForm.append(self._createInputForHidden(fieldName, hiddenVal));
                    continue;
                }
                var $fieldContainer = $('<div class="jtable-input-field-container"></div>').appendTo($editForm);
                $fieldContainer.append(self._createInputLabelForRecordField(fieldName));
                var currentValue = self._getValueForRecordField(record, fieldName);
                $fieldContainer.append(self._createInputForRecordField({
                    fieldName: fieldName,
                    value: currentValue,
                    record: record,
                    formType: "edit",
                    form: $editForm
                }));
            }
            self._makeCascadeDropDowns($editForm, record, "edit");
            self._$editingRow = $tableRow;
            self._$editDiv.append($editForm).dialog("open");
            self._trigger("formCreated", null, {
                form: $editForm,
                formType: "edit",
                record: record,
                row: $tableRow
            });
        },
        _saveEditForm: function($editForm, $saveButton) {
            var self = this;
            self._submitFormUsingAjax($editForm.attr("action"), $editForm.serialize(), function(data) {
                if (data.Result != "OK") {
                    self._showError(data.Message);
                    self._setEnabledOfDialogButton($saveButton, true, self.options.messages.save);
                    return;
                }
                var record = self._$editingRow.data("record");
                self._updateRecordValuesFromForm(record, $editForm);
                self._updateRecordValuesFromServerResponse(record, data);
                self._updateRowTexts(self._$editingRow);
                self._$editingRow.attr("data-record-key", self._getKeyValueOfRecord(record));
                self._onRecordUpdated(self._$editingRow, data);
                if (self.options.animationsEnabled) {
                    self._showUpdateAnimationForRow(self._$editingRow);
                }
                self._$editDiv.dialog("close");
            }, function() {
                self._showError(self.options.messages.serverCommunicationError);
                self._setEnabledOfDialogButton($saveButton, true, self.options.messages.save);
            });
        },
        _updateRecordValuesFromServerResponse: function(record, serverResponse) {
            if (!serverResponse || !serverResponse.Record) {
                return;
            }
            $.extend(true, record, serverResponse.Record);
        },
        _getValueForRecordField: function(record, fieldName) {
            var field = this.options.fields[fieldName];
            var fieldValue = record[fieldName];
            if (field.type == "date") {
                return this._getDisplayTextForDateRecordField(field, fieldValue);
            } else {
                return fieldValue;
            }
        },
        _updateRowTexts: function($tableRow) {
            var record = $tableRow.data("record");
            var $columns = $tableRow.find("td");
            for (var i = 0; i < this._columnList.length; i++) {
                var displayItem = this._getDisplayTextForRecordField(record, this._columnList[i]);
                $columns.eq(this._firstDataColumnOffset + i).html(displayItem || "");
            }
            this._onRowUpdated($tableRow);
        },
        _showUpdateAnimationForRow: function($tableRow) {
            var className = "jtable-row-updated";
            if (this.options.jqueryuiTheme) {
                className = className + " ui-state-highlight";
            }
            $tableRow.stop(true, true).addClass(className, "slow", "", function() {
                $tableRow.removeClass(className, 5e3);
            });
        },
        _onRowUpdated: function($row) {
            this._trigger("rowUpdated", null, {
                row: $row,
                record: $row.data("record")
            });
        },
        _onRecordUpdated: function($row, data) {
            this._trigger("recordUpdated", null, {
                record: $row.data("record"),
                row: $row,
                serverResponse: data
            });
        }
    });
})(jQuery);

/**********************************************************@preserve*****
* DELETION extension for jTable                                         *
*************************************************************************/
(function($) {
    var base = {
        _create: $.hik.jtable.prototype._create,
        _addColumnsToHeaderRow: $.hik.jtable.prototype._addColumnsToHeaderRow,
        _addCellsToRowUsingRecord: $.hik.jtable.prototype._addCellsToRowUsingRecord
    };
    $.extend(true, $.hik.jtable.prototype, {
        options: {
            deleteConfirmation: true,
            recordDeleted: function(event, data) {},
            messages: {
                deleteConfirmation: "This record will be deleted. Are you sure?",
                deleteText: "Delete",
                deleting: "Deleting",
                canNotDeletedRecords: "Can not delete {0} of {1} records!",
                deleteProggress: "Deleting {0} of {1} records, processing..."
            }
        },
        _$deleteRecordDiv: null,
        _$deletingRow: null,
        _create: function() {
            base._create.apply(this, arguments);
            this._createDeleteDialogDiv();
        },
        _createDeleteDialogDiv: function() {
            var self = this;
            self._$deleteRecordDiv = $('<div><p><span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 20px 0;"></span><span class="jtable-delete-confirm-message"></span></p></div>').appendTo(self._$mainContainer);
            self._$deleteRecordDiv.dialog({
                autoOpen: false,
                show: self.options.dialogShowEffect,
                hide: self.options.dialogHideEffect,
                modal: true,
                title: self.options.messages.areYouSure,
                buttons: [ {
                    text: self.options.messages.cancel,
                    click: function() {
                        self._$deleteRecordDiv.dialog("close");
                    }
                }, {
                    id: "DeleteDialogButton",
                    text: self.options.messages.deleteText,
                    click: function() {
                        if (self._$deletingRow.hasClass("jtable-row-removed")) {
                            self._$deleteRecordDiv.dialog("close");
                            return;
                        }
                        var $deleteButton = $("#DeleteDialogButton");
                        self._setEnabledOfDialogButton($deleteButton, false, self.options.messages.deleting);
                        self._deleteRecordFromServer(self._$deletingRow, function() {
                            self._removeRowsFromTableWithAnimation(self._$deletingRow);
                            self._$deleteRecordDiv.dialog("close");
                        }, function(message) {
                            self._showError(message);
                            self._setEnabledOfDialogButton($deleteButton, true, self.options.messages.deleteText);
                        });
                    }
                } ],
                close: function() {
                    var $deleteButton = $("#DeleteDialogButton");
                    self._setEnabledOfDialogButton($deleteButton, true, self.options.messages.deleteText);
                }
            });
        },
        deleteRows: function($rows) {
            var self = this;
            if ($rows.length <= 0) {
                self._logWarn("No rows specified to jTable deleteRows method.");
                return;
            }
            if (self._isBusy()) {
                self._logWarn("Can not delete rows since jTable is busy!");
                return;
            }
            if ($rows.length == 1) {
                self._deleteRecordFromServer($rows, function() {
                    self._removeRowsFromTableWithAnimation($rows);
                }, function(message) {
                    self._showError(message);
                });
                return;
            }
            self._showBusy(self._formatString(self.options.messages.deleteProggress, 0, $rows.length));
            var completedCount = 0;
            var isCompleted = function() {
                return completedCount >= $rows.length;
            };
            var completed = function() {
                var $deletedRows = $rows.filter(".jtable-row-ready-to-remove");
                if ($deletedRows.length < $rows.length) {
                    self._showError(self._formatString(self.options.messages.canNotDeletedRecords, $rows.length - $deletedRows.length, $rows.length));
                }
                if ($deletedRows.length > 0) {
                    self._removeRowsFromTableWithAnimation($deletedRows);
                }
                self._hideBusy();
            };
            var deletedCount = 0;
            $rows.each(function() {
                var $row = $(this);
                self._deleteRecordFromServer($row, function() {
                    ++deletedCount;
                    ++completedCount;
                    $row.addClass("jtable-row-ready-to-remove");
                    self._showBusy(self._formatString(self.options.messages.deleteProggress, deletedCount, $rows.length));
                    if (isCompleted()) {
                        completed();
                    }
                }, function() {
                    ++completedCount;
                    if (isCompleted()) {
                        completed();
                    }
                });
            });
        },
        deleteRecord: function(options) {
            var self = this;
            options = $.extend({
                clientOnly: false,
                animationsEnabled: self.options.animationsEnabled,
                url: self.options.actions.deleteAction,
                success: function() {},
                error: function() {}
            }, options);
            if (options.key == undefined) {
                self._logWarn("options parameter in deleteRecord method must contain a key property.");
                return;
            }
            var $deletingRow = self.getRowByKey(options.key);
            if ($deletingRow == null) {
                self._logWarn("Can not found any row by key: " + options.key);
                return;
            }
            if (options.clientOnly) {
                self._removeRowsFromTableWithAnimation($deletingRow, options.animationsEnabled);
                options.success();
                return;
            }
            self._deleteRecordFromServer($deletingRow, function(data) {
                self._removeRowsFromTableWithAnimation($deletingRow, options.animationsEnabled);
                options.success(data);
            }, function(message) {
                self._showError(message);
                options.error(message);
            }, options.url);
        },
        _addColumnsToHeaderRow: function($tr) {
            base._addColumnsToHeaderRow.apply(this, arguments);
            if (this.options.actions.deleteAction != undefined) {
                $tr.append(this._createEmptyCommandHeader());
            }
        },
        _addCellsToRowUsingRecord: function($row) {
            base._addCellsToRowUsingRecord.apply(this, arguments);
            var self = this;
            if (self.options.actions.deleteAction != undefined) {
                var $span = $("<span></span>").html(self.options.messages.deleteText);
                var $button = $('<button title="' + self.options.messages.deleteText + '"></button>').addClass("jtable-command-button jtable-delete-command-button").append($span).click(function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    self._deleteButtonClickedForRow($row);
                });
                $("<td></td>").addClass("jtable-command-column").append($button).appendTo($row);
            }
        },
        _deleteButtonClickedForRow: function($row) {
            var self = this;
            var deleteConfirm;
            var deleteConfirmMessage = self.options.messages.deleteConfirmation;
            if ($.isFunction(self.options.deleteConfirmation)) {
                var data = {
                    row: $row,
                    record: $row.data("record"),
                    deleteConfirm: true,
                    deleteConfirmMessage: deleteConfirmMessage,
                    cancel: false,
                    cancelMessage: null
                };
                self.options.deleteConfirmation(data);
                if (data.cancel) {
                    if (data.cancelMessage) {
                        self._showError(data.cancelMessage);
                    }
                    return;
                }
                deleteConfirmMessage = data.deleteConfirmMessage;
                deleteConfirm = data.deleteConfirm;
            } else {
                deleteConfirm = self.options.deleteConfirmation;
            }
            if (deleteConfirm != false) {
                self._$deleteRecordDiv.find(".jtable-delete-confirm-message").html(deleteConfirmMessage);
                self._showDeleteDialog($row);
            } else {
                self._deleteRecordFromServer($row, function() {
                    self._removeRowsFromTableWithAnimation($row);
                }, function(message) {
                    self._showError(message);
                });
            }
        },
        _showDeleteDialog: function($row) {
            this._$deletingRow = $row;
            this._$deleteRecordDiv.dialog("open");
        },
        _deleteRecordFromServer: function($row, success, error, url) {
            var self = this;
            if ($row.data("deleting") == true) {
                return;
            }
            $row.data("deleting", true);
            var postData = {};
            postData[self._keyField] = self._getKeyValueOfRecord($row.data("record"));
            this._ajax({
                url: url || self.options.actions.deleteAction,
                data: postData,
                success: function(data) {
                    if (data.Result != "OK") {
                        $row.data("deleting", false);
                        if (error) {
                            error(data.Message);
                        }
                        return;
                    }
                    self._trigger("recordDeleted", null, {
                        record: $row.data("record"),
                        row: $row,
                        serverResponse: data
                    });
                    if (success) {
                        success(data);
                    }
                },
                error: function() {
                    $row.data("deleting", false);
                    if (error) {
                        error(self.options.messages.serverCommunicationError);
                    }
                }
            });
        },
        _removeRowsFromTableWithAnimation: function($rows, animationsEnabled) {
            var self = this;
            if (animationsEnabled == undefined) {
                animationsEnabled = self.options.animationsEnabled;
            }
            if (animationsEnabled) {
                var className = "jtable-row-deleting";
                if (this.options.jqueryuiTheme) {
                    className = className + " ui-state-disabled";
                }
                $rows.stop(true, true).addClass(className, "slow", "").promise().done(function() {
                    self._removeRowsFromTable($rows, "deleted");
                });
            } else {
                self._removeRowsFromTable($rows, "deleted");
            }
        }
    });
})(jQuery);

/**********************************************************@preserve*****
* SELECTING extension for jTable                                        *
*************************************************************************/
(function($) {
    var base = {
        _create: $.hik.jtable.prototype._create,
        _addColumnsToHeaderRow: $.hik.jtable.prototype._addColumnsToHeaderRow,
        _addCellsToRowUsingRecord: $.hik.jtable.prototype._addCellsToRowUsingRecord,
        _onLoadingRecords: $.hik.jtable.prototype._onLoadingRecords,
        _onRecordsLoaded: $.hik.jtable.prototype._onRecordsLoaded,
        _onRowsRemoved: $.hik.jtable.prototype._onRowsRemoved
    };
    $.extend(true, $.hik.jtable.prototype, {
        options: {
            selecting: false,
            multiselect: false,
            selectingCheckboxes: false,
            selectOnRowClick: true,
            selectionChanged: function(event, data) {}
        },
        _selectedRecordIdsBeforeLoad: null,
        _$selectAllCheckbox: null,
        _shiftKeyDown: false,
        _create: function() {
            if (this.options.selecting && this.options.selectingCheckboxes) {
                ++this._firstDataColumnOffset;
                this._bindKeyboardEvents();
            }
            base._create.apply(this, arguments);
        },
        _bindKeyboardEvents: function() {
            var self = this;
            $(document).keydown(function(event) {
                switch (event.which) {
                  case 16:
                    self._shiftKeyDown = true;
                    break;
                }
            }).keyup(function(event) {
                switch (event.which) {
                  case 16:
                    self._shiftKeyDown = false;
                    break;
                }
            });
        },
        selectedRows: function() {
            return this._getSelectedRows();
        },
        selectRows: function($rows) {
            this._selectRows($rows);
            this._onSelectionChanged();
        },
        _addColumnsToHeaderRow: function($tr) {
            if (this.options.selecting && this.options.selectingCheckboxes) {
                if (this.options.multiselect) {
                    $tr.append(this._createSelectAllHeader());
                } else {
                    $tr.append(this._createEmptyCommandHeader());
                }
            }
            base._addColumnsToHeaderRow.apply(this, arguments);
        },
        _addCellsToRowUsingRecord: function($row) {
            if (this.options.selecting) {
                this._makeRowSelectable($row);
            }
            base._addCellsToRowUsingRecord.apply(this, arguments);
        },
        _onLoadingRecords: function() {
            if (this.options.selecting) {
                this._storeSelectionList();
            }
            base._onLoadingRecords.apply(this, arguments);
        },
        _onRecordsLoaded: function() {
            if (this.options.selecting) {
                this._restoreSelectionList();
            }
            base._onRecordsLoaded.apply(this, arguments);
        },
        _onRowsRemoved: function($rows, reason) {
            if (this.options.selecting && reason != "reloading" && $rows.filter(".jtable-row-selected").length > 0) {
                this._onSelectionChanged();
            }
            base._onRowsRemoved.apply(this, arguments);
        },
        _createSelectAllHeader: function() {
            var self = this;
            var $columnHeader = $('<th class=""></th>').addClass("jtable-command-column-header jtable-column-header-selecting");
            this._jqueryuiThemeAddClass($columnHeader, "ui-state-default");
            var $headerContainer = $("<div />").addClass("jtable-column-header-container").appendTo($columnHeader);
            self._$selectAllCheckbox = $('<input type="checkbox" />').appendTo($headerContainer).click(function() {
                if (self._$tableRows.length <= 0) {
                    self._$selectAllCheckbox.attr("checked", false);
                    return;
                }
                var allRows = self._$tableBody.find(">tr.jtable-data-row");
                if (self._$selectAllCheckbox.is(":checked")) {
                    self._selectRows(allRows);
                } else {
                    self._deselectRows(allRows);
                }
                self._onSelectionChanged();
            });
            return $columnHeader;
        },
        _storeSelectionList: function() {
            var self = this;
            if (!self.options.selecting) {
                return;
            }
            self._selectedRecordIdsBeforeLoad = [];
            self._getSelectedRows().each(function() {
                self._selectedRecordIdsBeforeLoad.push(self._getKeyValueOfRecord($(this).data("record")));
            });
        },
        _restoreSelectionList: function() {
            var self = this;
            if (!self.options.selecting) {
                return;
            }
            var selectedRowCount = 0;
            for (var i = 0; i < self._$tableRows.length; ++i) {
                var recordId = self._getKeyValueOfRecord(self._$tableRows[i].data("record"));
                if ($.inArray(recordId, self._selectedRecordIdsBeforeLoad) > -1) {
                    self._selectRows(self._$tableRows[i]);
                    ++selectedRowCount;
                }
            }
            if (self._selectedRecordIdsBeforeLoad.length > 0 && self._selectedRecordIdsBeforeLoad.length != selectedRowCount) {
                self._onSelectionChanged();
            }
            self._selectedRecordIdsBeforeLoad = [];
            self._refreshSelectAllCheckboxState();
        },
        _getSelectedRows: function() {
            return this._$tableBody.find(">tr.jtable-row-selected");
        },
        _makeRowSelectable: function($row) {
            var self = this;
            if (self.options.selectOnRowClick) {
                $row.click(function() {
                    self._invertRowSelection($row);
                });
            }
            if (self.options.selectingCheckboxes) {
                var $cell = $("<td></td>").addClass("jtable-selecting-column");
                var $selectCheckbox = $('<input type="checkbox" />').appendTo($cell);
                if (!self.options.selectOnRowClick) {
                    $selectCheckbox.click(function() {
                        self._invertRowSelection($row);
                    });
                }
                $row.append($cell);
            }
        },
        _invertRowSelection: function($row) {
            if ($row.hasClass("jtable-row-selected")) {
                this._deselectRows($row);
            } else {
                if (this._shiftKeyDown) {
                    var rowIndex = this._findRowIndex($row);
                    var beforeIndex = this._findFirstSelectedRowIndexBeforeIndex(rowIndex) + 1;
                    if (beforeIndex > 0 && beforeIndex < rowIndex) {
                        this._selectRows(this._$tableBody.find("tr").slice(beforeIndex, rowIndex + 1));
                    } else {
                        var afterIndex = this._findFirstSelectedRowIndexAfterIndex(rowIndex) - 1;
                        if (afterIndex > rowIndex) {
                            this._selectRows(this._$tableBody.find("tr").slice(rowIndex, afterIndex + 1));
                        } else {
                            this._selectRows($row);
                        }
                    }
                } else {
                    this._selectRows($row);
                }
            }
            this._onSelectionChanged();
        },
        _findFirstSelectedRowIndexBeforeIndex: function(rowIndex) {
            for (var i = rowIndex - 1; i >= 0; --i) {
                if (this._$tableRows[i].hasClass("jtable-row-selected")) {
                    return i;
                }
            }
            return -1;
        },
        _findFirstSelectedRowIndexAfterIndex: function(rowIndex) {
            for (var i = rowIndex + 1; i < this._$tableRows.length; ++i) {
                if (this._$tableRows[i].hasClass("jtable-row-selected")) {
                    return i;
                }
            }
            return -1;
        },
        _selectRows: function($rows) {
            if (!this.options.multiselect) {
                this._deselectRows(this._getSelectedRows());
            }
            $rows.addClass("jtable-row-selected");
            this._jqueryuiThemeAddClass($rows, "ui-state-highlight");
            if (this.options.selectingCheckboxes) {
                $rows.find(">td.jtable-selecting-column >input").prop("checked", true);
            }
            this._refreshSelectAllCheckboxState();
        },
        _deselectRows: function($rows) {
            $rows.removeClass("jtable-row-selected ui-state-highlight");
            if (this.options.selectingCheckboxes) {
                $rows.find(">td.jtable-selecting-column >input").prop("checked", false);
            }
            this._refreshSelectAllCheckboxState();
        },
        _refreshSelectAllCheckboxState: function() {
            if (!this.options.selectingCheckboxes || !this.options.multiselect) {
                return;
            }
            var totalRowCount = this._$tableRows.length;
            var selectedRowCount = this._getSelectedRows().length;
            if (selectedRowCount == 0) {
                this._$selectAllCheckbox.prop("indeterminate", false);
                this._$selectAllCheckbox.attr("checked", false);
            } else if (selectedRowCount == totalRowCount) {
                this._$selectAllCheckbox.prop("indeterminate", false);
                this._$selectAllCheckbox.attr("checked", true);
            } else {
                this._$selectAllCheckbox.attr("checked", false);
                this._$selectAllCheckbox.prop("indeterminate", true);
            }
        },
        _onSelectionChanged: function() {
            this._trigger("selectionChanged", null, {});
        }
    });
})(jQuery);

/**********************************************************@preserve*****
* PAGING extension for jTable                                           *
*************************************************************************/
(function($) {
    var base = {
        load: $.hik.jtable.prototype.load,
        _create: $.hik.jtable.prototype._create,
        _setOption: $.hik.jtable.prototype._setOption,
        _createRecordLoadUrl: $.hik.jtable.prototype._createRecordLoadUrl,
        _addRowToTable: $.hik.jtable.prototype._addRowToTable,
        _addRow: $.hik.jtable.prototype._addRow,
        _removeRowsFromTable: $.hik.jtable.prototype._removeRowsFromTable,
        _onRecordsLoaded: $.hik.jtable.prototype._onRecordsLoaded
    };
    $.extend(true, $.hik.jtable.prototype, {
        options: {
            paging: false,
            pageList: "normal",
            pageSize: 10,
            pageSizes: [ 10, 25, 50, 100, 250, 500 ],
            pageSizeChangeArea: true,
            gotoPageArea: "combobox",
            messages: {
                pagingInfo: "Showing {0}-{1} of {2}",
                pageSizeChangeLabel: "Row count",
                gotoPageLabel: "Go to page"
            }
        },
        _$bottomPanel: null,
        _$pagingListArea: null,
        _$pageSizeChangeArea: null,
        _$pageInfoSpan: null,
        _$gotoPageArea: null,
        _$gotoPageInput: null,
        _totalRecordCount: 0,
        _currentPageNo: 1,
        _create: function() {
            base._create.apply(this, arguments);
            if (this.options.paging) {
                this._loadPagingSettings();
                this._createBottomPanel();
                this._createPageListArea();
                this._createGotoPageInput();
                this._createPageSizeSelection();
            }
        },
        _loadPagingSettings: function() {
            if (!this.options.saveUserPreferences) {
                return;
            }
            var pageSize = this._getCookie("page-size");
            if (pageSize) {
                this.options.pageSize = this._normalizeNumber(pageSize, 1, 1e6, this.options.pageSize);
            }
        },
        _createBottomPanel: function() {
            this._$bottomPanel = $("<div />").addClass("jtable-bottom-panel").insertAfter(this._$table);
            this._jqueryuiThemeAddClass(this._$bottomPanel, "ui-state-default");
            $("<div />").addClass("jtable-left-area").appendTo(this._$bottomPanel);
            $("<div />").addClass("jtable-right-area").appendTo(this._$bottomPanel);
        },
        _createPageListArea: function() {
            this._$pagingListArea = $("<span></span>").addClass("jtable-page-list").appendTo(this._$bottomPanel.find(".jtable-left-area"));
            this._$pageInfoSpan = $("<span></span>").addClass("jtable-page-info").appendTo(this._$bottomPanel.find(".jtable-right-area"));
        },
        _createPageSizeSelection: function() {
            var self = this;
            if (!self.options.pageSizeChangeArea) {
                return;
            }
            if (self._findIndexInArray(self.options.pageSize, self.options.pageSizes) < 0) {
                self.options.pageSizes.push(parseInt(self.options.pageSize));
                self.options.pageSizes.sort(function(a, b) {
                    return a - b;
                });
            }
            self._$pageSizeChangeArea = $("<span></span>").addClass("jtable-page-size-change").appendTo(self._$bottomPanel.find(".jtable-left-area"));
            self._$pageSizeChangeArea.append("<span>" + self.options.messages.pageSizeChangeLabel + ": </span>");
            var $pageSizeChangeCombobox = $("<select></select>").appendTo(self._$pageSizeChangeArea);
            for (var i = 0; i < self.options.pageSizes.length; i++) {
                $pageSizeChangeCombobox.append('<option value="' + self.options.pageSizes[i] + '">' + self.options.pageSizes[i] + "</option>");
            }
            $pageSizeChangeCombobox.val(self.options.pageSize);
            $pageSizeChangeCombobox.change(function() {
                self._changePageSize(parseInt($(this).val()));
            });
        },
        _createGotoPageInput: function() {
            var self = this;
            if (!self.options.gotoPageArea || self.options.gotoPageArea == "none") {
                return;
            }
            this._$gotoPageArea = $("<span></span>").addClass("jtable-goto-page").appendTo(self._$bottomPanel.find(".jtable-left-area"));
            this._$gotoPageArea.append("<span>" + self.options.messages.gotoPageLabel + ": </span>");
            if (self.options.gotoPageArea == "combobox") {
                self._$gotoPageInput = $("<select></select>").appendTo(this._$gotoPageArea).data("pageCount", 1).change(function() {
                    self._changePage(parseInt($(this).val()));
                });
                self._$gotoPageInput.append('<option value="1">1</option>');
            } else {
                self._$gotoPageInput = $('<input type="text" maxlength="10" value="' + self._currentPageNo + '" />').appendTo(this._$gotoPageArea).keypress(function(event) {
                    if (event.which == 13) {
                        event.preventDefault();
                        self._changePage(parseInt(self._$gotoPageInput.val()));
                    } else if (event.which == 43) {
                        event.preventDefault();
                        self._changePage(parseInt(self._$gotoPageInput.val()) + 1);
                    } else if (event.which == 45) {
                        event.preventDefault();
                        self._changePage(parseInt(self._$gotoPageInput.val()) - 1);
                    } else {
                        var isValid = 47 < event.keyCode && event.keyCode < 58 && event.shiftKey == false && event.altKey == false || event.keyCode == 8 || event.keyCode == 9;
                        if (!isValid) {
                            event.preventDefault();
                        }
                    }
                });
            }
        },
        _refreshGotoPageInput: function() {
            if (!this.options.gotoPageArea || this.options.gotoPageArea == "none") {
                return;
            }
            if (this._totalRecordCount <= 0) {
                this._$gotoPageArea.hide();
            } else {
                this._$gotoPageArea.show();
            }
            if (this.options.gotoPageArea == "combobox") {
                var oldPageCount = this._$gotoPageInput.data("pageCount");
                var currentPageCount = this._calculatePageCount();
                if (oldPageCount != currentPageCount) {
                    this._$gotoPageInput.empty();
                    var pageStep = 1;
                    if (currentPageCount > 1e4) {
                        pageStep = 100;
                    } else if (currentPageCount > 5e3) {
                        pageStep = 10;
                    } else if (currentPageCount > 2e3) {
                        pageStep = 5;
                    } else if (currentPageCount > 1e3) {
                        pageStep = 2;
                    }
                    for (var i = pageStep; i <= currentPageCount; i += pageStep) {
                        this._$gotoPageInput.append('<option value="' + i + '">' + i + "</option>");
                    }
                    this._$gotoPageInput.data("pageCount", currentPageCount);
                }
            }
            this._$gotoPageInput.val(this._currentPageNo);
        },
        load: function() {
            this._currentPageNo = 1;
            base.load.apply(this, arguments);
        },
        _setOption: function(key, value) {
            base._setOption.apply(this, arguments);
            if (key == "pageSize") {
                this._changePageSize(parseInt(value));
            }
        },
        _changePageSize: function(pageSize) {
            if (pageSize == this.options.pageSize) {
                return;
            }
            this.options.pageSize = pageSize;
            var pageCount = this._calculatePageCount();
            if (this._currentPageNo > pageCount) {
                this._currentPageNo = pageCount;
            }
            if (this._currentPageNo <= 0) {
                this._currentPageNo = 1;
            }
            var $pageSizeChangeCombobox = this._$bottomPanel.find(".jtable-page-size-change select");
            if ($pageSizeChangeCombobox.length > 0) {
                if (parseInt($pageSizeChangeCombobox.val()) != pageSize) {
                    var selectedOption = $pageSizeChangeCombobox.find("option[value=" + pageSize + "]");
                    if (selectedOption.length > 0) {
                        $pageSizeChangeCombobox.val(pageSize);
                    }
                }
            }
            this._savePagingSettings();
            this._reloadTable();
        },
        _savePagingSettings: function() {
            if (!this.options.saveUserPreferences) {
                return;
            }
            this._setCookie("page-size", this.options.pageSize);
        },
        _createRecordLoadUrl: function() {
            var loadUrl = base._createRecordLoadUrl.apply(this, arguments);
            loadUrl = this._addPagingInfoToUrl(loadUrl, this._currentPageNo);
            return loadUrl;
        },
        _addRowToTable: function($tableRow, index, isNewRow) {
            if (isNewRow && this.options.paging) {
                this._reloadTable();
                return;
            }
            base._addRowToTable.apply(this, arguments);
        },
        _addRow: function($row, options) {
            if (options && options.isNewRow && this.options.paging) {
                this._reloadTable();
                return;
            }
            base._addRow.apply(this, arguments);
        },
        _removeRowsFromTable: function($rows, reason) {
            base._removeRowsFromTable.apply(this, arguments);
            if (this.options.paging) {
                if (this._$tableRows.length <= 0 && this._currentPageNo > 1) {
                    --this._currentPageNo;
                }
                this._reloadTable();
            }
        },
        _onRecordsLoaded: function(data) {
            if (this.options.paging) {
                this._totalRecordCount = data.TotalRecordCount;
                this._createPagingList();
                this._createPagingInfo();
                this._refreshGotoPageInput();
            }
            base._onRecordsLoaded.apply(this, arguments);
        },
        _addPagingInfoToUrl: function(url, pageNumber) {
            if (!this.options.paging) {
                return url;
            }
            var jtStartIndex = (pageNumber - 1) * this.options.pageSize;
            var jtPageSize = this.options.pageSize;
            return url + (url.indexOf("?") < 0 ? "?" : "&") + "jtStartIndex=" + jtStartIndex + "&jtPageSize=" + jtPageSize;
        },
        _createPagingList: function() {
            if (this.options.pageSize <= 0) {
                return;
            }
            this._$pagingListArea.empty();
            if (this._totalRecordCount <= 0) {
                return;
            }
            var pageCount = this._calculatePageCount();
            this._createFirstAndPreviousPageButtons();
            if (this.options.pageList == "normal") {
                this._createPageNumberButtons(this._calculatePageNumbers(pageCount));
            }
            this._createLastAndNextPageButtons(pageCount);
            this._bindClickEventsToPageNumberButtons();
        },
        _createFirstAndPreviousPageButtons: function() {
            var $first = $("<span></span>").addClass("jtable-page-number-first").html("&lt&lt").data("pageNumber", 1).appendTo(this._$pagingListArea);
            var $previous = $("<span></span>").addClass("jtable-page-number-previous").html("&lt").data("pageNumber", this._currentPageNo - 1).appendTo(this._$pagingListArea);
            this._jqueryuiThemeAddClass($first, "ui-button ui-state-default", "ui-state-hover");
            this._jqueryuiThemeAddClass($previous, "ui-button ui-state-default", "ui-state-hover");
            if (this._currentPageNo <= 1) {
                $first.addClass("jtable-page-number-disabled");
                $previous.addClass("jtable-page-number-disabled");
                this._jqueryuiThemeAddClass($first, "ui-state-disabled");
                this._jqueryuiThemeAddClass($previous, "ui-state-disabled");
            }
        },
        _createLastAndNextPageButtons: function(pageCount) {
            var $next = $("<span></span>").addClass("jtable-page-number-next").html("&gt").data("pageNumber", this._currentPageNo + 1).appendTo(this._$pagingListArea);
            var $last = $("<span></span>").addClass("jtable-page-number-last").html("&gt&gt").data("pageNumber", pageCount).appendTo(this._$pagingListArea);
            this._jqueryuiThemeAddClass($next, "ui-button ui-state-default", "ui-state-hover");
            this._jqueryuiThemeAddClass($last, "ui-button ui-state-default", "ui-state-hover");
            if (this._currentPageNo >= pageCount) {
                $next.addClass("jtable-page-number-disabled");
                $last.addClass("jtable-page-number-disabled");
                this._jqueryuiThemeAddClass($next, "ui-state-disabled");
                this._jqueryuiThemeAddClass($last, "ui-state-disabled");
            }
        },
        _createPageNumberButtons: function(pageNumbers) {
            var previousNumber = 0;
            for (var i = 0; i < pageNumbers.length; i++) {
                if (pageNumbers[i] - previousNumber > 1) {
                    $("<span></span>").addClass("jtable-page-number-space").html("...").appendTo(this._$pagingListArea);
                }
                this._createPageNumberButton(pageNumbers[i]);
                previousNumber = pageNumbers[i];
            }
        },
        _createPageNumberButton: function(pageNumber) {
            var $pageNumber = $("<span></span>").addClass("jtable-page-number").html(pageNumber).data("pageNumber", pageNumber).appendTo(this._$pagingListArea);
            this._jqueryuiThemeAddClass($pageNumber, "ui-button ui-state-default", "ui-state-hover");
            if (this._currentPageNo == pageNumber) {
                $pageNumber.addClass("jtable-page-number-active jtable-page-number-disabled");
                this._jqueryuiThemeAddClass($pageNumber, "ui-state-active");
            }
        },
        _calculatePageCount: function() {
            var pageCount = Math.floor(this._totalRecordCount / this.options.pageSize);
            if (this._totalRecordCount % this.options.pageSize != 0) {
                ++pageCount;
            }
            return pageCount;
        },
        _calculatePageNumbers: function(pageCount) {
            if (pageCount <= 4) {
                var pageNumbers = [];
                for (var i = 1; i <= pageCount; ++i) {
                    pageNumbers.push(i);
                }
                return pageNumbers;
            } else {
                var shownPageNumbers = [ 1, 2, pageCount - 1, pageCount ];
                var previousPageNo = this._normalizeNumber(this._currentPageNo - 1, 1, pageCount, 1);
                var nextPageNo = this._normalizeNumber(this._currentPageNo + 1, 1, pageCount, 1);
                this._insertToArrayIfDoesNotExists(shownPageNumbers, previousPageNo);
                this._insertToArrayIfDoesNotExists(shownPageNumbers, this._currentPageNo);
                this._insertToArrayIfDoesNotExists(shownPageNumbers, nextPageNo);
                shownPageNumbers.sort(function(a, b) {
                    return a - b;
                });
                return shownPageNumbers;
            }
        },
        _createPagingInfo: function() {
            if (this._totalRecordCount <= 0) {
                this._$pageInfoSpan.empty();
                return;
            }
            var startNo = (this._currentPageNo - 1) * this.options.pageSize + 1;
            var endNo = this._currentPageNo * this.options.pageSize;
            endNo = this._normalizeNumber(endNo, startNo, this._totalRecordCount, 0);
            if (endNo >= startNo) {
                var pagingInfoMessage = this._formatString(this.options.messages.pagingInfo, startNo, endNo, this._totalRecordCount);
                this._$pageInfoSpan.html(pagingInfoMessage);
            }
        },
        _bindClickEventsToPageNumberButtons: function() {
            var self = this;
            self._$pagingListArea.find(".jtable-page-number,.jtable-page-number-previous,.jtable-page-number-next,.jtable-page-number-first,.jtable-page-number-last").not(".jtable-page-number-disabled").click(function(e) {
                e.preventDefault();
                self._changePage($(this).data("pageNumber"));
            });
        },
        _changePage: function(pageNo) {
            pageNo = this._normalizeNumber(pageNo, 1, this._calculatePageCount(), 1);
            if (pageNo == this._currentPageNo) {
                this._refreshGotoPageInput();
                return;
            }
            this._currentPageNo = pageNo;
            this._reloadTable();
        }
    });
})(jQuery);

/**********************************************************@preserve*****
* SORTING extension for jTable                                          *
*************************************************************************/
(function($) {
    var base = {
        _initializeFields: $.hik.jtable.prototype._initializeFields,
        _normalizeFieldOptions: $.hik.jtable.prototype._normalizeFieldOptions,
        _createHeaderCellForField: $.hik.jtable.prototype._createHeaderCellForField,
        _createRecordLoadUrl: $.hik.jtable.prototype._createRecordLoadUrl
    };
    $.extend(true, $.hik.jtable.prototype, {
        options: {
            sorting: false,
            multiSorting: false,
            defaultSorting: ""
        },
        _lastSorting: null,
        _initializeFields: function() {
            base._initializeFields.apply(this, arguments);
            this._lastSorting = [];
            if (this.options.sorting) {
                this._buildDefaultSortingArray();
            }
        },
        _normalizeFieldOptions: function(fieldName, props) {
            base._normalizeFieldOptions.apply(this, arguments);
            props.sorting = props.sorting != false;
        },
        _createHeaderCellForField: function(fieldName, field) {
            var $headerCell = base._createHeaderCellForField.apply(this, arguments);
            if (this.options.sorting && field.sorting) {
                this._makeColumnSortable($headerCell, fieldName);
            }
            return $headerCell;
        },
        _createRecordLoadUrl: function() {
            var loadUrl = base._createRecordLoadUrl.apply(this, arguments);
            loadUrl = this._addSortingInfoToUrl(loadUrl);
            return loadUrl;
        },
        _buildDefaultSortingArray: function() {
            var self = this;
            $.each(self.options.defaultSorting.split(","), function(orderIndex, orderValue) {
                $.each(self.options.fields, function(fieldName, fieldProps) {
                    if (fieldProps.sorting) {
                        var colOffset = orderValue.indexOf(fieldName);
                        if (colOffset > -1) {
                            if (orderValue.toUpperCase().indexOf("DESC", colOffset) > -1) {
                                self._lastSorting.push({
                                    fieldName: fieldName,
                                    sortOrder: "DESC"
                                });
                            } else {
                                self._lastSorting.push({
                                    fieldName: fieldName,
                                    sortOrder: "ASC"
                                });
                            }
                        }
                    }
                });
            });
        },
        _makeColumnSortable: function($columnHeader, fieldName) {
            var self = this;
            $columnHeader.addClass("jtable-column-header-sortable").click(function(e) {
                e.preventDefault();
                if (!self.options.multiSorting || !e.ctrlKey) {
                    self._lastSorting = [];
                }
                self._sortTableByColumn($columnHeader);
            });
            $.each(this._lastSorting, function(sortIndex, sortField) {
                if (sortField.fieldName == fieldName) {
                    if (sortField.sortOrder == "DESC") {
                        $columnHeader.addClass("jtable-column-header-sorted-desc");
                    } else {
                        $columnHeader.addClass("jtable-column-header-sorted-asc");
                    }
                }
            });
        },
        _sortTableByColumn: function($columnHeader) {
            if (this._lastSorting.length == 0) {
                $columnHeader.siblings().removeClass("jtable-column-header-sorted-asc jtable-column-header-sorted-desc");
            }
            for (var i = 0; i < this._lastSorting.length; i++) {
                if (this._lastSorting[i].fieldName == $columnHeader.data("fieldName")) {
                    this._lastSorting.splice(i--, 1);
                }
            }
            if ($columnHeader.hasClass("jtable-column-header-sorted-asc")) {
                $columnHeader.removeClass("jtable-column-header-sorted-asc").addClass("jtable-column-header-sorted-desc");
                this._lastSorting.push({
                    fieldName: $columnHeader.data("fieldName"),
                    sortOrder: "DESC"
                });
            } else {
                $columnHeader.removeClass("jtable-column-header-sorted-desc").addClass("jtable-column-header-sorted-asc");
                this._lastSorting.push({
                    fieldName: $columnHeader.data("fieldName"),
                    sortOrder: "ASC"
                });
            }
            this._reloadTable();
        },
        _addSortingInfoToUrl: function(url) {
            if (!this.options.sorting || this._lastSorting.length == 0) {
                return url;
            }
            var sorting = [];
            $.each(this._lastSorting, function(idx, value) {
                sorting.push(value.fieldName + " " + value.sortOrder);
            });
            return url + (url.indexOf("?") < 0 ? "?" : "&") + "jtSorting=" + sorting.join(",");
        }
    });
})(jQuery);

/**********************************************************@preserve*****
* DYNAMIC COLUMNS extension for jTable                                  *
* (Show/hide/resize columns)                                            *
*************************************************************************/
(function($) {
    var base = {
        _create: $.hik.jtable.prototype._create,
        _normalizeFieldOptions: $.hik.jtable.prototype._normalizeFieldOptions,
        _createHeaderCellForField: $.hik.jtable.prototype._createHeaderCellForField,
        _createCellForRecordField: $.hik.jtable.prototype._createCellForRecordField
    };
    $.extend(true, $.hik.jtable.prototype, {
        options: {
            tableId: undefined,
            columnResizable: true,
            columnSelectable: true
        },
        _$columnSelectionDiv: null,
        _$columnResizeBar: null,
        _cookieKeyPrefix: null,
        _currentResizeArgs: null,
        _create: function() {
            base._create.apply(this, arguments);
            this._createColumnResizeBar();
            this._createColumnSelection();
            if (this.options.saveUserPreferences) {
                this._loadColumnSettings();
            }
            this._normalizeColumnWidths();
        },
        _normalizeFieldOptions: function(fieldName, props) {
            base._normalizeFieldOptions.apply(this, arguments);
            if (this.options.columnResizable) {
                props.columnResizable = props.columnResizable != false;
            }
            if (!props.visibility) {
                props.visibility = "visible";
            }
        },
        _createHeaderCellForField: function(fieldName, field) {
            var $headerCell = base._createHeaderCellForField.apply(this, arguments);
            if (this.options.columnResizable && field.columnResizable && fieldName != this._columnList[this._columnList.length - 1]) {
                this._makeColumnResizable($headerCell);
            }
            if (field.visibility == "hidden") {
                $headerCell.hide();
            }
            return $headerCell;
        },
        _createCellForRecordField: function(record, fieldName) {
            var $column = base._createCellForRecordField.apply(this, arguments);
            var field = this.options.fields[fieldName];
            if (field.visibility == "hidden") {
                $column.hide();
            }
            return $column;
        },
        changeColumnVisibility: function(columnName, visibility) {
            this._changeColumnVisibilityInternal(columnName, visibility);
            this._normalizeColumnWidths();
            if (this.options.saveUserPreferences) {
                this._saveColumnSettings();
            }
        },
        _changeColumnVisibilityInternal: function(columnName, visibility) {
            var columnIndex = this._columnList.indexOf(columnName);
            if (columnIndex < 0) {
                this._logWarn('Column "' + columnName + '" does not exist in fields!');
                return;
            }
            if ([ "visible", "hidden", "fixed" ].indexOf(visibility) < 0) {
                this._logWarn('Visibility value is not valid: "' + visibility + '"! Options are: visible, hidden, fixed.');
                return;
            }
            var field = this.options.fields[columnName];
            if (field.visibility == visibility) {
                return;
            }
            var columnIndexInTable = this._firstDataColumnOffset + columnIndex + 1;
            if (field.visibility != "hidden" && visibility == "hidden") {
                this._$table.find(">thead >tr >th:nth-child(" + columnIndexInTable + "),>tbody >tr >td:nth-child(" + columnIndexInTable + ")").hide();
            } else if (field.visibility == "hidden" && visibility != "hidden") {
                this._$table.find(">thead >tr >th:nth-child(" + columnIndexInTable + "),>tbody >tr >td:nth-child(" + columnIndexInTable + ")").show().css("display", "table-cell");
            }
            field.visibility = visibility;
        },
        _createColumnSelection: function() {
            var self = this;
            this._$columnSelectionDiv = $("<div />").addClass("jtable-column-selection-container").appendTo(self._$mainContainer);
            this._$table.children("thead").bind("contextmenu", function(e) {
                if (!self.options.columnSelectable) {
                    return;
                }
                e.preventDefault();
                $("<div />").addClass("jtable-contextmenu-overlay").click(function() {
                    $(this).remove();
                    self._$columnSelectionDiv.hide();
                }).bind("contextmenu", function() {
                    return false;
                }).appendTo(document.body);
                self._fillColumnSelection();
                var containerOffset = self._$mainContainer.offset();
                var selectionDivTop = e.pageY - containerOffset.top;
                var selectionDivLeft = e.pageX - containerOffset.left;
                var selectionDivMinWidth = 100;
                var containerWidth = self._$mainContainer.width();
                if (containerWidth > selectionDivMinWidth && selectionDivLeft > containerWidth - selectionDivMinWidth) {
                    selectionDivLeft = containerWidth - selectionDivMinWidth;
                }
                self._$columnSelectionDiv.css({
                    left: selectionDivLeft,
                    top: selectionDivTop,
                    "min-width": selectionDivMinWidth + "px"
                }).show();
            });
        },
        _fillColumnSelection: function() {
            var self = this;
            var $columnsUl = $("<ul></ul>").addClass("jtable-column-select-list");
            for (var i = 0; i < this._columnList.length; i++) {
                var columnName = this._columnList[i];
                var field = this.options.fields[columnName];
                var $columnLi = $("<li></li>").appendTo($columnsUl);
                var $label = $('<label for="' + columnName + '"></label>').append($("<span>" + (field.title || columnName) + "</span>")).appendTo($columnLi);
                var $checkbox = $('<input type="checkbox" name="' + columnName + '">').prependTo($label).click(function() {
                    var $clickedCheckbox = $(this);
                    var clickedColumnName = $clickedCheckbox.attr("name");
                    var clickedField = self.options.fields[clickedColumnName];
                    if (clickedField.visibility == "fixed") {
                        return;
                    }
                    self.changeColumnVisibility(clickedColumnName, $clickedCheckbox.is(":checked") ? "visible" : "hidden");
                });
                if (field.visibility != "hidden") {
                    $checkbox.attr("checked", "checked");
                }
                if (field.visibility == "fixed") {
                    $checkbox.attr("disabled", "disabled");
                }
            }
            this._$columnSelectionDiv.html($columnsUl);
        },
        _createColumnResizeBar: function() {
            this._$columnResizeBar = $("<div />").addClass("jtable-column-resize-bar").appendTo(this._$mainContainer).hide();
        },
        _makeColumnResizable: function($columnHeader) {
            var self = this;
            $("<div />").addClass("jtable-column-resize-handler").appendTo($columnHeader.find(".jtable-column-header-container")).mousedown(function(downevent) {
                downevent.preventDefault();
                downevent.stopPropagation();
                var mainContainerOffset = self._$mainContainer.offset();
                var $nextColumnHeader = $columnHeader.nextAll("th.jtable-column-header:visible:first");
                if (!$nextColumnHeader.length) {
                    return;
                }
                var minimumColumnWidth = 10;
                self._currentResizeArgs = {
                    currentColumnStartWidth: $columnHeader.outerWidth(),
                    minWidth: minimumColumnWidth,
                    maxWidth: $columnHeader.outerWidth() + $nextColumnHeader.outerWidth() - minimumColumnWidth,
                    mouseStartX: downevent.pageX,
                    minResizeX: function() {
                        return this.mouseStartX - (this.currentColumnStartWidth - this.minWidth);
                    },
                    maxResizeX: function() {
                        return this.mouseStartX + (this.maxWidth - this.currentColumnStartWidth);
                    }
                };
                var resizeonmousemove = function(moveevent) {
                    if (!self._currentResizeArgs) {
                        return;
                    }
                    var resizeBarX = self._normalizeNumber(moveevent.pageX, self._currentResizeArgs.minResizeX(), self._currentResizeArgs.maxResizeX());
                    self._$columnResizeBar.css("left", resizeBarX - mainContainerOffset.left + "px");
                };
                var resizeonmouseup = function(upevent) {
                    if (!self._currentResizeArgs) {
                        return;
                    }
                    $(document).unbind("mousemove", resizeonmousemove);
                    $(document).unbind("mouseup", resizeonmouseup);
                    self._$columnResizeBar.hide();
                    var mouseChangeX = upevent.pageX - self._currentResizeArgs.mouseStartX;
                    var currentColumnFinalWidth = self._normalizeNumber(self._currentResizeArgs.currentColumnStartWidth + mouseChangeX, self._currentResizeArgs.minWidth, self._currentResizeArgs.maxWidth);
                    var nextColumnFinalWidth = $nextColumnHeader.outerWidth() + (self._currentResizeArgs.currentColumnStartWidth - currentColumnFinalWidth);
                    var pixelToPercentRatio = $columnHeader.data("width-in-percent") / self._currentResizeArgs.currentColumnStartWidth;
                    $columnHeader.data("width-in-percent", currentColumnFinalWidth * pixelToPercentRatio);
                    $nextColumnHeader.data("width-in-percent", nextColumnFinalWidth * pixelToPercentRatio);
                    $columnHeader.css("width", $columnHeader.data("width-in-percent") + "%");
                    $nextColumnHeader.css("width", $nextColumnHeader.data("width-in-percent") + "%");
                    self._normalizeColumnWidths();
                    self._currentResizeArgs = null;
                    if (self.options.saveUserPreferences) {
                        self._saveColumnSettings();
                    }
                };
                self._$columnResizeBar.show().css({
                    top: $columnHeader.offset().top - mainContainerOffset.top + "px",
                    left: downevent.pageX - mainContainerOffset.left + "px",
                    height: self._$table.outerHeight() + "px"
                });
                $(document).bind("mousemove", resizeonmousemove);
                $(document).bind("mouseup", resizeonmouseup);
            });
        },
        _normalizeColumnWidths: function() {
            var commandColumnHeaders = this._$table.find(">thead th.jtable-command-column-header").data("width-in-percent", 1).css("width", "1%");
            var headerCells = this._$table.find(">thead th.jtable-column-header");
            var totalWidthInPixel = 0;
            headerCells.each(function() {
                var $cell = $(this);
                if ($cell.is(":visible")) {
                    totalWidthInPixel += $cell.outerWidth();
                }
            });
            var columnWidhts = {};
            var availableWidthInPercent = 100 - commandColumnHeaders.length;
            headerCells.each(function() {
                var $cell = $(this);
                if ($cell.is(":visible")) {
                    var fieldName = $cell.data("fieldName");
                    var widthInPercent = $cell.outerWidth() * availableWidthInPercent / totalWidthInPixel;
                    columnWidhts[fieldName] = widthInPercent;
                }
            });
            headerCells.each(function() {
                var $cell = $(this);
                if ($cell.is(":visible")) {
                    var fieldName = $cell.data("fieldName");
                    $cell.data("width-in-percent", columnWidhts[fieldName]).css("width", columnWidhts[fieldName] + "%");
                }
            });
        },
        _saveColumnSettings: function() {
            var self = this;
            var fieldSettings = "";
            this._$table.find(">thead >tr >th.jtable-column-header").each(function() {
                var $cell = $(this);
                var fieldName = $cell.data("fieldName");
                var columnWidth = $cell.data("width-in-percent");
                var fieldVisibility = self.options.fields[fieldName].visibility;
                var fieldSetting = fieldName + "=" + fieldVisibility + ";" + columnWidth;
                fieldSettings = fieldSettings + fieldSetting + "|";
            });
            this._setCookie("column-settings", fieldSettings.substr(0, fieldSettings.length - 1));
        },
        _loadColumnSettings: function() {
            var self = this;
            var columnSettingsCookie = this._getCookie("column-settings");
            if (!columnSettingsCookie) {
                return;
            }
            var columnSettings = {};
            $.each(columnSettingsCookie.split("|"), function(inx, fieldSetting) {
                var splitted = fieldSetting.split("=");
                var fieldName = splitted[0];
                var settings = splitted[1].split(";");
                columnSettings[fieldName] = {
                    columnVisibility: settings[0],
                    columnWidth: settings[1]
                };
            });
            var headerCells = this._$table.find(">thead >tr >th.jtable-column-header");
            headerCells.each(function() {
                var $cell = $(this);
                var fieldName = $cell.data("fieldName");
                var field = self.options.fields[fieldName];
                if (columnSettings[fieldName]) {
                    if (field.visibility != "fixed") {
                        self._changeColumnVisibilityInternal(fieldName, columnSettings[fieldName].columnVisibility);
                    }
                    $cell.data("width-in-percent", columnSettings[fieldName].columnWidth).css("width", columnSettings[fieldName].columnWidth + "%");
                }
            });
        }
    });
})(jQuery);

/**********************************************************@preserve*****
* MASTER/CHILD tables extension for jTable                              *
*************************************************************************/
(function($) {
    var base = {
        _removeRowsFromTable: $.hik.jtable.prototype._removeRowsFromTable
    };
    $.extend(true, $.hik.jtable.prototype, {
        options: {
            openChildAsAccordion: false
        },
        openChildTable: function($row, tableOptions, opened) {
            var self = this;
            if (tableOptions.jqueryuiTheme == undefined) {
                tableOptions.jqueryuiTheme = self.options.jqueryuiTheme;
            }
            tableOptions.showCloseButton = tableOptions.showCloseButton != false;
            if (tableOptions.showCloseButton && !tableOptions.closeRequested) {
                tableOptions.closeRequested = function() {
                    self.closeChildTable($row);
                };
            }
            if (self.options.openChildAsAccordion) {
                $row.siblings(".jtable-data-row").each(function() {
                    self.closeChildTable($(this));
                });
            }
            self.closeChildTable($row, function() {
                var $childRowColumn = self.getChildRow($row).children("td").empty();
                var $childTableContainer = $("<div />").addClass("jtable-child-table-container").appendTo($childRowColumn);
                $childRowColumn.data("childTable", $childTableContainer);
                $childTableContainer.jtable(tableOptions);
                self.openChildRow($row);
                $childTableContainer.hide().slideDown("fast", function() {
                    if (opened) {
                        opened({
                            childTable: $childTableContainer
                        });
                    }
                });
            });
        },
        closeChildTable: function($row, closed) {
            var self = this;
            var $childRowColumn = this.getChildRow($row).children("td");
            var $childTable = $childRowColumn.data("childTable");
            if (!$childTable) {
                if (closed) {
                    closed();
                }
                return;
            }
            $childRowColumn.data("childTable", null);
            $childTable.slideUp("fast", function() {
                $childTable.jtable("destroy");
                $childTable.remove();
                self.closeChildRow($row);
                if (closed) {
                    closed();
                }
            });
        },
        isChildRowOpen: function($row) {
            return this.getChildRow($row).is(":visible");
        },
        getChildRow: function($row) {
            return $row.data("childRow") || this._createChildRow($row);
        },
        openChildRow: function($row) {
            var $childRow = this.getChildRow($row);
            if (!$childRow.is(":visible")) {
                $childRow.show();
            }
            return $childRow;
        },
        closeChildRow: function($row) {
            var $childRow = this.getChildRow($row);
            if ($childRow.is(":visible")) {
                $childRow.hide();
            }
        },
        _removeRowsFromTable: function($rows, reason) {
            var self = this;
            if (reason == "deleted") {
                $rows.each(function() {
                    var $row = $(this);
                    var $childRow = $row.data("childRow");
                    if ($childRow) {
                        self.closeChildTable($row);
                        $childRow.remove();
                    }
                });
            }
            base._removeRowsFromTable.apply(this, arguments);
        },
        _createChildRow: function($row) {
            var totalColumnCount = this._$table.find("thead th").length;
            var $childRow = $("<tr></tr>").addClass("jtable-child-row").append('<td colspan="' + totalColumnCount + '"></td>');
            $row.after($childRow);
            $row.data("childRow", $childRow);
            $childRow.hide();
            return $childRow;
        }
    });
})(jQuery);