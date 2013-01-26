﻿/************************************************************************
* FORMS extension for jTable (base for edit/create forms)               *
*************************************************************************/
(function ($) {

    $.extend(true, $.hik.jtable.prototype, {

        /************************************************************************
        * PRIVATE METHODS                                                       *
        *************************************************************************/

        /* Submits a form asynchronously using AJAX.
        *  This method is needed, since form submitting logic can be overrided
        *  by extensions.
        *************************************************************************/
        _submitFormUsingAjax: function (url, formData, success, error) {
            this._ajax({
                url: url,
                data: formData,
                success: success,
                error: error
            });
        },

        /* Creates label for an input element.
        *************************************************************************/
        _createInputLabelForRecordField: function (fieldName) {
            //TODO: May create label tag instead of a div.
            return $('<div />')
                .addClass('jtable-input-label')
                .html(this.options.fields[fieldName].title);
        },

        /* Creates an input element according to field type.
        *************************************************************************/
        _createInputForRecordField: function (funcParams) {
            var fieldName = funcParams.fieldName,
                value = funcParams.value,
                record = funcParams.record,
                formType = funcParams.formType,
                form = funcParams.form;

            //Get the field
            var field = this.options.fields[fieldName];

            //If value if not supplied, use defaultValue of the field
            if (value == undefined || value == null) {
                value = field.defaultValue;
            }

            //Use custom function if supplied
            if (field.input) {
                var $input = $(field.input({
                    value: value,
                    record: record,
                    formType: formType,
                    form: form
                }));

                //Add id attribute if does not exists
                if (!$input.attr('id')) {
                    $input.attr('id', 'Edit-' + fieldName);
                }

                //Wrap input element with div
                return $('<div />')
                    .addClass('jtable-input jtable-custom-input')
                    .append($input);
            }

            //Create input according to field type
            if (field.type == 'date') {
                return this._createDateInputForField(field, fieldName, value);
            } else if (field.type == 'textarea') {
                return this._createTextAreaForField(field, fieldName, value);
            } else if (field.type == 'password') {
                return this._createPasswordInputForField(field, fieldName, value);
            } else if (field.type == 'checkbox') {
                return this._createCheckboxForField(field, fieldName, value);
            } else if (field.options) {
                if (field.type == 'radiobutton') {
                    return this._createRadioButtonListForField(field, fieldName, value, record, formType);
                } else {
                    return this._createDropDownListForField(field, fieldName, value, record, formType, form);
                }
            } else {
                return this._createTextInputForField(field, fieldName, value);
            }
        },

        //Creates a hidden input element with given name and value.
        _createInputForHidden: function (fieldName, value) {
            if (value == undefined || value == null) {
                value = "";
            }

            return $('<input type="hidden" value="' + value + '" name="' + fieldName + '" id="Edit-' + fieldName + '"></input>');
        },

        /* Creates a date input for a field.
        *************************************************************************/
        _createDateInputForField: function (field, fieldName, value) {
            var $input = $('<input class="' + field.inputClass + '" id="Edit-' + fieldName + '" type="text"' + (value != undefined ? 'value="' + value + '"' : '') + ' name="' + fieldName + '"></input>');
            var displayFormat = field.displayFormat || this.options.defaultDateFormat;
            $input.datepicker({ dateFormat: displayFormat });
            return $('<div />')
                .addClass('jtable-input jtable-date-input')
                .append($input);
        },

        /* Creates a textarea element for a field.
        *************************************************************************/
        _createTextAreaForField: function (field, fieldName, value) {
            var $textArea = $('<textarea class="' + field.inputClass + '" id="Edit-' + fieldName + '" name="' + fieldName + '">' + (value || '') + '</textarea>');
            return $('<div />')
                .addClass('jtable-input jtable-textarea-input')
                .append($textArea);
        },

        /* Creates a standart textbox for a field.
        *************************************************************************/
        _createTextInputForField: function (field, fieldName, value) {
            var $input = $('<input class="' + field.inputClass + '" id="Edit-' + fieldName + '" type="text"' + (value != undefined ? 'value="' + value + '"' : '') + ' name="' + fieldName + '"></input>');
            return $('<div />')
                .addClass('jtable-input jtable-text-input')
                .append($input);
        },

        /* Creates a password input for a field.
        *************************************************************************/
        _createPasswordInputForField: function (field, fieldName, value) {
            var $input = $('<input class="' + field.inputClass + '" id="Edit-' + fieldName + '" type="password"' + (value != undefined ? 'value="' + value + '"' : '') + ' name="' + fieldName + '"></input>');
            return $('<div />')
                .addClass('jtable-input jtable-password-input')
                .append($input);
        },

        /* Creates a checkboxfor a field.
        *************************************************************************/
        _createCheckboxForField: function (field, fieldName, value) {
            var self = this;

            //If value is undefined, get unchecked state's value
            if (value == undefined) {
                value = self._getCheckBoxPropertiesForFieldByState(fieldName, false).Value;
            }

            //Create a container div
            var $containerDiv = $('<div />')
                .addClass('jtable-input jtable-checkbox-input');

            //Create checkbox and check if needed
            var $checkBox = $('<input class="' + field.inputClass + '" id="Edit-' + fieldName + '" type="checkbox" name="' + fieldName + '" value="' + value + '" />')
                .appendTo($containerDiv);

            //Create display text of checkbox for current state
            var $textSpan = $('<span>' + (field.formText || self._getCheckBoxTextForFieldByValue(fieldName, value)) + '</span>')
                .appendTo($containerDiv);

            //Check the checkbox if it's value is checked-value
            if (self._getIsCheckBoxSelectedForFieldByValue(fieldName, value)) {
                $checkBox.attr('checked', 'checked');
            }

            //This method sets checkbox's value and text according to state of the checkbox
            var refreshCheckBoxValueAndText = function () {
                var checkboxProps = self._getCheckBoxPropertiesForFieldByState(fieldName, $checkBox.is(':checked'));
                $checkBox.attr('value', checkboxProps.Value);
                $textSpan.html(field.formText || checkboxProps.DisplayText);
            };

            //Register to click event to change display text when state of checkbox is changed.
            $checkBox.click(function () {
                refreshCheckBoxValueAndText();
            });

            //Change checkbox state when clicked to text
            if (field.setOnTextClick != false) {
                $textSpan
                    .addClass('jtable-option-text-clickable')
                    .click(function () {
                        if ($checkBox.is(':checked')) {
                            $checkBox.attr('checked', false);
                        } else {
                            $checkBox.attr('checked', true);
                        }

                        refreshCheckBoxValueAndText();
                    });
            }

            return $containerDiv;
        },

        /* Creates a drop down list (combobox) input element for a field.
        *************************************************************************/
        _createDropDownListForField: function (field, fieldName, value, record, source, form) {

            //Create a container div
            var $containerDiv = $('<div />')
                .addClass('jtable-input jtable-dropdown-input');

            //Create select element
            var $select = $('<select class="' + field.inputClass + '" id="Edit-' + fieldName + '" name="' + fieldName + '"></select>')
                .appendTo($containerDiv);

            if (field.dependsOn) {
                $select.attr('data-depends-on', field.dependsOn);
            }

            //add options
            var options = this._getOptionsForField(fieldName, {
                record: record,
                source: source,
                form: form,
                dependedValues: this._createDependedValuesUsingForm(form, field.dependsOn)
            });

            this._fillDropDownListWithOptions($select, options, value);

            return $containerDiv;
        },
        
        /* Fills a dropdown list with given options.
        *************************************************************************/
        _fillDropDownListWithOptions: function ($select, options, value) {
            $select.empty();
            for (var i = 0; i < options.length; i++) {
                $select.append('<option value="' + options[i].Value + '"' + (options[i].Value == value ? ' selected="selected"' : '') + '>' + options[i].DisplayText + '</option>');
            }
        },

        _createDependedValuesUsingForm: function ($form, dependsOn) {

            if (!dependsOn) {
                return {};
            }

            var $dependsOn = $form.find('select[name=' + dependsOn + ']');
            if ($dependsOn.length <= 0) {
                return {};
            }

            var dependedValues = {};
            dependedValues[dependsOn] = $dependsOn.val();

            return dependedValues;
        },

        /* Creates a radio button list for a field.
        *************************************************************************/
        _createRadioButtonListForField: function (field, fieldName, value, record, source) {
            var $containerDiv = $('<div />')
                .addClass('jtable-input jtable-radiobuttonlist-input');

            var options = this._getOptionsForField(fieldName, {
                record: record,
                source: source
            });

            $.each(options, function(i, option) {
                var $radioButtonDiv = $('<div class=""></div>')
                    .addClass('jtable-radio-input')
                    .appendTo($containerDiv);

                var $radioButton = $('<input type="radio" id="Edit-' + fieldName + '-' + i + '" class="' + field.inputClass + '" name="' + fieldName + '" value="' + option.Value + '"' + ((option.Value == (value + '')) ? ' checked="true"' : '') + ' />')
                    .appendTo($radioButtonDiv);

                var $textSpan = $('<span></span>')
                    .html(option.DisplayText)
                    .appendTo($radioButtonDiv);

                if (field.setOnTextClick != false) {
                    $textSpan
                        .addClass('jtable-option-text-clickable')
                        .click(function () {
                            if (!$radioButton.is(':checked')) {
                                $radioButton.attr('checked', true);
                            }
                        });
                }
            });

            return $containerDiv;
        },

        /* Gets display text for a checkbox field.
        *************************************************************************/
        _getCheckBoxTextForFieldByValue: function (fieldName, value) {
            return this.options.fields[fieldName].values[value];
        },

        /* Returns true if given field's value must be checked state.
        *************************************************************************/
        _getIsCheckBoxSelectedForFieldByValue: function (fieldName, value) {
            return (this._createCheckBoxStateArrayForFieldWithCaching(fieldName)[1].Value.toString() == value.toString());
        },

        /* Gets an object for a checkbox field that has Value and DisplayText
        *  properties.
        *************************************************************************/
        _getCheckBoxPropertiesForFieldByState: function (fieldName, checked) {
            return this._createCheckBoxStateArrayForFieldWithCaching(fieldName)[(checked ? 1 : 0)];
        },

        /* Calls _createCheckBoxStateArrayForField with caching.
        *************************************************************************/
        _createCheckBoxStateArrayForFieldWithCaching: function (fieldName) {
            var cacheKey = 'checkbox_' + fieldName;
            if (!this._cache[cacheKey]) {

                this._cache[cacheKey] = this._createCheckBoxStateArrayForField(fieldName);
            }

            return this._cache[cacheKey];
        },

        /* Creates a two element array of objects for states of a checkbox field.
        *  First element for unchecked state, second for checked state.
        *  Each object has two properties: Value and DisplayText
        *************************************************************************/
        _createCheckBoxStateArrayForField: function (fieldName) {
            var stateArray = [];
            var currentIndex = 0;
            $.each(this.options.fields[fieldName].values, function (propName, propValue) {
                if (currentIndex++ < 2) {
                    stateArray.push({ 'Value': propName, 'DisplayText': propValue });
                }
            });

            return stateArray;
        },

        /* Searches a form for dependend dropdowns and makes them cascaded.
        */
        _makeCascadeDropDowns: function ($form, record, source) {
            var self = this;

            $form.find('select[data-depends-on]')
                .each(function () {
                    var $thisDropdown = $(this);
                    var fieldName = $thisDropdown.attr('name');
                    if (!fieldName) {
                        return;
                    }

                    var dependsOnField = $thisDropdown.attr('data-depends-on');
                    var $dependsOn = $form.find('select[name=' + dependsOnField + ']');
                    $dependsOn.change(function () {

                        //Refresh options

                        var funcParams = {
                            record: record,
                            source: source,
                            form: $form,
                            dependedValues: {}
                        };
                        funcParams.dependedValues[dependsOnField] = $dependsOn.val();

                        var options = self._getOptionsForField(fieldName, funcParams);
                        self._fillDropDownListWithOptions($thisDropdown, options, undefined);

                        //Thigger change event to refresh multi cascade dropdowns.
                        
                        $thisDropdown.change();
                    });
                });
        },

        /* Updates values of a record from given form
        *************************************************************************/
        _updateRecordValuesFromForm: function (record, $form) {
            for (var i = 0; i < this._fieldList.length; i++) {
                var fieldName = this._fieldList[i];
                var field = this.options.fields[fieldName];

                //Do not update non-editable fields
                if (field.edit == false) {
                    continue;
                }

                //Get field name and the input element of this field in the form
                var $inputElement = $form.find('[name="' + fieldName + '"]');
                if ($inputElement.length <= 0) {
                    continue;
                }

                //Update field in record according to it's type
                if (field.type == 'date') {
                    var displayFormat = field.displayFormat || this.options.defaultDateFormat;
                    try {
                        var date = $.datepicker.parseDate(displayFormat, $inputElement.val());
                        record[fieldName] = '/Date(' + date.getTime() + ')/';
                    } catch (e) {
                        //TODO: Handle incorrect/different date formats
                        record[fieldName] = '/Date(' + (new Date()).getTime() + ')/';
                    }
                } else if (field.options && field.type == 'radiobutton') {
                    var $checkedElement = $inputElement.filter(':checked');
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

        /* Download options for a field from server.
        *************************************************************************/
        _downloadOptions: function (fieldName, url) {
            var self = this;
            var options = [];

            self._ajax({
                url: url,
                async: false,
                success: function (data) {
                    if (data.Result != 'OK') {
                        self._showError(data.Message);
                        return;
                    }

                    options = data.Options;
                },
                error: function () {
                    var errMessage = self._formatString(self.options.messages.cannotLoadOptionsFor, fieldName);
                    self._showError(errMessage);
                }
            });

            return options;
        },

        /* Sets enabled/disabled state of a dialog button.
        *************************************************************************/
        _setEnabledOfDialogButton: function ($button, enabled, buttonText) {
            if (!$button) {
                return;
            }

            if (enabled != false) {
                $button
                    .removeAttr('disabled')
                    .removeClass('ui-state-disabled');
            } else {
                $button
                    .attr('disabled', 'disabled')
                    .addClass('ui-state-disabled');
            }

            if (buttonText) {
                $button
                    .find('span')
                    .text(buttonText);
            }
        }

    });

})(jQuery);
