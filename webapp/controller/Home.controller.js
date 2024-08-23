sap.ui.define([
    "./BaseController",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
],
    function (Controller, Filter, FilterOperator, JSONModel, MessageBox, MessageToast) {
        "use strict";

        return Controller.extend("com.app.parkingapplication.controller.Home", {
            onInit: function () {
                this._filterParkingSlots("Inward");
                this._setParkingLotModel();
            },
            onBeforeRendering: function () {
                this.updateSoltsStatusbyDate();
            },
            //Notification Badge Count...
            onAfterRendering: function () {
                this._updateNotificationCount();
            },
            statusColorFormatter: function (sStatus) {
                switch (sStatus) {
                  case "Occupied":
                    return "Error"; // Red
                  case "Available":
                    return "Success"; // Green
                  case "Reserved":
                    return "Warning"; // Orange
                  default:
                    return "None"; // Default color
                }
              },
            onSelectItem: function (oEvent) {
                var oItem = oEvent.getParameter("item").getKey();
                var navContainer = this.getView().byId("pageContainer");

                switch (oItem) {
                    case "AllSlots":
                        navContainer.to(this.getView().createId("Page1"));
                        break;
                    case "AssignedSlots":
                        navContainer.to(this.getView().createId("Page2"));
                        break;
                    case "Parking-lotAllocation":
                        navContainer.to(this.getView().createId("Page3"));
                        break;
                    case "History":
                        navContainer.to(this.getView().createId("Page4"));
                        break;
                    case "DataVisualization":
                        navContainer.to(this.getView().createId("Page5"));
                        break;
                    case "Reservations":
                        var oModel = this.getView().getModel();
                        oModel.setUseBatch(false);
                        oModel.refresh(true);
                        navContainer.to(this.getView().createId("Page6"));
                        break;
                    case "Reserved":
                        navContainer.to(this.getView().createId("Page7"));
                        break;
                }
            },
            onSideNavButtonPress: function () {
                var oToolPage = this.byId("toolPage");
                var bSideExpanded = oToolPage.getSideExpanded();

                this._setToggleButtonTooltip(bSideExpanded);
                oToolPage.setSideExpanded(!bSideExpanded);
            },
            _setToggleButtonTooltip: function (bLarge) {
                var oToggleButton = this.byId('sideNavigationToggleButton');
                oToggleButton.setTooltip(bLarge ? 'Large Size Navigation' : 'Small Size Navigation');
            },
            onSelectAssign: async function () {
                // Retrieve input values
                const oUserView = this.getView();
                var sVehicleNumber = this.byId("_IDGenInput1").getValue();
                var sDriverName = this.byId("_IDGenInput2").getValue();
                var sPhoneNumber = this.byId("_IDGenInput3").getValue();
                var sTransportType = this.byId("_IDGenInput4").getSelected() ? "Outward" : "Inward";
                var sParkingLotNumber = this.byId("parkingLotSelect").getSelectedKey();

                var bValid = true;
                if (!sDriverName || sDriverName.length < 4) {
                    oUserView.byId("_IDGenInput2").setValueState("Error");
                    oUserView.byId("_IDGenInput2").setValueStateText("Name Must Contain 4 Characters");
                    bValid = false;
                } else {
                    oUserView.byId("_IDGenInput2").setValueState("None");
                }

                if (!sPhoneNumber || sPhoneNumber.length !== 10 || !/^\d+$/.test(sPhoneNumber)) {
                    oUserView.byId("_IDGenInput3").setValueState("Error");
                    oUserView.byId("_IDGenInput3").setValueStateText("Mobile number must be a 10-digit numeric value");
                    bValid = false;
                } else {
                    oUserView.byId("_IDGenInput3").setValueState("None");
                }
                if (!sVehicleNumber || !/^[A-Z]{2}\d{2}[A-Z]{2}\d{4}$/.test(sVehicleNumber)) {
                    oUserView.byId("_IDGenInput1").setValueState("Error");
                    oUserView.byId("_IDGenInput1").setValueStateText("Vehicle number should follow this pattern AP12BG1234");
                    bValid = false;
                } else {
                    oUserView.byId("_IDGenInput1").setValueState("None");
                }
                if (!sTransportType) {
                    oUserView.byId("_IDGenInput4").setValueState("Error");
                    bValid = false;
                } else {
                    oUserView.byId("_IDGenInput4").setValueState("None");
                }
                if (!sParkingLotNumber) {
                    oUserView.byId("parkingLotSelect").setValueState("Error");
                    bValid = false;
                } else {
                    oUserView.byId("parkingLotSelect").setValueState("None");
                }

                if (!bValid) {
                    MessageToast.show("Please enter correct data");
                    return; // Prevent further execution
                }

                else {
                    const oModel = this.getView().getModel();

                    var bVehicleExists = await this.checkVehicleExists(oModel, sVehicleNumber);
                    if (bVehicleExists) {
                        sap.m.MessageBox.error("The vehicle is already assigned to a parking lot.");
                        return; // Prevent further execution
                    }
                }
                // Format current date and time for CHAR(25)
                var oCurrentDateTime = new Date();
                var sYear = oCurrentDateTime.getFullYear();
                var sMonth = ("0" + (oCurrentDateTime.getMonth() + 1)).slice(-2);
                var sDay = ("0" + oCurrentDateTime.getDate()).slice(-2);
                var sHours = ("0" + oCurrentDateTime.getHours()).slice(-2);
                var sMinutes = ("0" + oCurrentDateTime.getMinutes()).slice(-2);
                var sSeconds = ("0" + oCurrentDateTime.getSeconds()).slice(-2);

                // Construct the inTime string in YYYY-MM-DD HH:MM:SS format
                var sInTime = `${sYear}-${sMonth}-${sDay} ${sHours}:${sMinutes}:${sSeconds}`;

                // If all validations pass, proceed with the create operation
                var oModel = this.getView().getModel();
                oModel.setUseBatch(false);
                var ID = this.generateUUID();

                var oPayload = {
                    vehicleNumber: sVehicleNumber,
                    driverName: sDriverName,
                    phoneNumber: sPhoneNumber,
                    trasnporTtype: sTransportType,
                    parkingLotNumber: sParkingLotNumber
                };
                var create = oModel.create("/ZASSIGNEDSet", {
                    Id: ID,
                    ParkinglotNumber: sParkingLotNumber,
                    VehicleNumber: sVehicleNumber,
                    Drivername: sDriverName,
                    Phonenumber: sPhoneNumber,
                    TransportType: sTransportType,
                    Intime: sInTime
                }, {
                    success: function () {
                        sap.m.MessageBox.success("Success");
                        this.printAssignmentDetails(oPayload);
                        // this.updateParkingLotSelect();
                        oModel.refresh(true);
                        this._setParkingLotModel();
                    }.bind(this),
                    error: function () {
                        sap.m.MessageBox.error("Error Exist");
                    }
                });
                if (create) {
                    // Replace with your actual Twilio Account SID and Auth Token
                    const accountSid ='' ;
                    const authToken = '';
                    var to = "+91" + sPhoneNumber;
                    // Function to send SMS using Twili
                    debugger
                    const toNumber = to; // Replace with recipient's phone number
                    const fromNumber = '+18149043908'; // Replace with your Twilio phone number
                    const messageBody = 'Hello ' + sDriverName + ',\n' +
                        'Your vehicle (' + sVehicleNumber + ') has been assigned to parking lot ' + sParkingLotNumber + '.\n' +
                        'Please park your vehicle in the assigned slot.\n' +
                        'Thank you,\n'

                    // Twilio API endpoint for sending messages
                    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

                    // Payload for the POST request
                    const payload = {
                        To: toNumber,
                        From: fromNumber,
                        Body: messageBody
                    };

                    // Send POST request to Twilio API using jQuery.ajax
                    $.ajax({
                        url: url,
                        type: 'POST',
                        headers: {
                            'Authorization': 'Basic ' + btoa(accountSid + ':' + authToken)
                        },
                        data: payload,
                        success: function (data) {
                            console.log('SMS sent successfully:', data);
                            // Handle success, e.g., show a success message
                            sap.m.MessageToast.show('SMS sent successfully!');
                        },
                        error: function (xhr, status, error) {
                            // Handle error, e.g., show an error message
                            sap.m.MessageToast.show('Failed to send SMS: ' + error);
                        }
                    });
                }
                const updatedParkingLot = {
                    Status: "Occupied" // Assuming false represents empty parking
                    // Add other properties if needed
                };
                oModel.update("/zparkinglot1Set('" + sParkingLotNumber + "')", updatedParkingLot, {
                    success: function () {
                    }.bind(this),
                    error: function (oError) {

                        sap.m.MessageBox.error("Failed to update: " + oError.message);
                    }.bind(this)
                });
                this.byId("_IDGenInput1").setValue("");
                this.byId("_IDGenInput2").setValue("");
                this.byId("_IDGenInput3").setValue("");
                this.byId("_IDGenInput4").setSelected(true);
                this.byId("parkingLotSelect").setSelectedKey("");
            },
            checkVehicleExists: function (oModel, sVehicleNumber) {
                return new Promise(function (resolve, reject) {
                    oModel.read("/ZASSIGNEDSet", {
                        filters: [new sap.ui.model.Filter("VehicleNumber", sap.ui.model.FilterOperator.EQ, sVehicleNumber)],
                        success: function (oData) {
                            if (oData.results && oData.results.length > 0) {
                                resolve(true);
                            } else {
                                resolve(false);
                            }
                        },
                        error: function (oError) {
                            reject(oError);
                        }
                    });
                });
            },
            updateParkingLotSelect: async function () {
                var oModel = this.getView().getModel();

                try {
                    var aInboundSlots = await new Promise((resolve, reject) => {
                        oModel.read("/zparkinglot1Set", {
                            filters: [
                                new sap.ui.model.Filter("TransportType", sap.ui.model.FilterOperator.EQ, "Inward"),
                                new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.EQ, "Available")
                            ],
                            success: function (oData) {
                                resolve(oData.results);
                            },
                            error: function (oError) {
                                reject(oError);
                            }
                        });
                    });
                    var oParkingLotSelect = this.byId("parkingLotSelect");
                    oParkingLotSelect.destroyItems();

                    aInboundSlots.forEach(slot => {
                        oParkingLotSelect.addItem(new sap.ui.core.Item({
                            key: slot.ParkinglotNumber,
                            text: slot.ParkinglotNumber,
                        }));
                    });
                } catch (error) {
                    sap.m.MessageBox.error("Failed to update parking lot select: " + error.message);
                }
            },
            _filterParkingSlots: function (TransportType) {
                var oSelect = this.getView().byId("parkingLotSelect");

                // Create filters for 'Available' status and truck type
                var aFilters = [
                    new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.EQ, "Available"),
                    new sap.ui.model.Filter("TransportType", sap.ui.model.FilterOperator.EQ, TransportType)
                ];

                // Bind the items aggregation of the Select control with the filters
                oSelect.bindAggregation("items", {
                    path: "/zparkinglot1Set",
                    template: new sap.ui.core.Item({
                        key: "{ParkinglotNumber}",
                        text: "{ParkinglotNumber}"
                    }),
                    filters: aFilters
                });
            },
            _setParkingLotModel: function () {
                // Fetch data from OData service
                var oModel = this.getOwnerComponent().getModel();
                var that = this;

                oModel.read("/zparkinglot1Set", {
                    success: function (oData) {
                        var aItems = oData.results;
                        var availableCount = aItems.filter(item => item.Status === "Available").length;
                        var occupiedCount = aItems.filter(item => item.Status === "Occupied").length;
                        var reserveCount = aItems.filter(item => item.Status === "Reserved").length;

                        var aChartData = {
                            Items: [
                                {
                                    Status: "Available",
                                    Count: availableCount
                                },
                                {
                                    Status: "Occupied",
                                    Count: occupiedCount
                                },
                                {
                                    Status: "Reserved",
                                    Count: reserveCount
                                }
                            ]
                        };
                        var oParkingLotModel = new JSONModel();
                        oParkingLotModel.setData(aChartData);
                        that.getView().setModel(oParkingLotModel, "ParkingLotModel");
                    },
                    error: function (oError) {
                        // Handle error
                        console.error(oError);
                    }
                });
            },
            onTruckTypeSelect: function () {
                var oView = this.getView();
                var oOutboundCheckBox = oView.byId("_IDGenInput4");

                // Default truck type is "Inbound"
                var sSelectedTruckType = "Inward";

                // If outbound checkbox is selected, update truck type to "Outbound"
                if (oOutboundCheckBox.getSelected()) {
                    sSelectedTruckType = "Outward";
                }

                // Apply filters to the parking lot Select control
                this.sSelectedTruckType = sSelectedTruckType;
                var aFilters = [
                    new sap.ui.model.Filter("TransportType", sap.ui.model.FilterOperator.EQ, sSelectedTruckType),
                    new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.EQ, 'Available')
                ];
                var oSelect = oView.byId("parkingLotSelect");
                oSelect.bindAggregation("items", {
                    path: "/zparkinglot1Set",
                    template: new sap.ui.core.Item({
                        key: "{ParkinglotNumber}",
                        text: "{ParkinglotNumber}"
                    }),
                    filters: aFilters
                });
            },
            onUnAssign: async function () {
                const oView = this.getView();
                var oSelected = this.byId("assignedSlotsTable").getSelectedItem();

                if (!oSelected) {
                    sap.m.MessageToast.show("Please select a vehicle to unassign");
                    return;
                }

                var sVehicle = oSelected.getBindingContext().getObject().VehicleNumber;
                var sSlotNumber = oSelected.getBindingContext().getObject().ParkinglotNumber;
                var sDriverName = oSelected.getBindingContext().getObject().Drivername;
                var sTypeofDelivery = oSelected.getBindingContext().getObject().TransportType;
                var sDriverMobile = oSelected.getBindingContext().getObject().Phonenumber;
                var dCheckInTime = oSelected.getBindingContext().getObject().Intime;
                var sAssignedSlotPath = oSelected.getBindingContext().getPath(); // Get the path to the selected entry

                var oCurrentDateTime = new Date();
                var sYear = oCurrentDateTime.getFullYear();
                var sMonth = ("0" + (oCurrentDateTime.getMonth() + 1)).slice(-2);
                var sDay = ("0" + oCurrentDateTime.getDate()).slice(-2);
                var sHours = ("0" + oCurrentDateTime.getHours()).slice(-2);
                var sMinutes = ("0" + oCurrentDateTime.getMinutes()).slice(-2);
                var sSeconds = ("0" + oCurrentDateTime.getSeconds()).slice(-2);

                // Construct the inTime string in YYYY-MM-DD HH:MM:SS format
                var sOuttime = `${sYear}-${sMonth}-${sDay} ${sHours}:${sMinutes}:${sSeconds}`;

                var oModel = this.getView().getModel();
                oModel.setUseBatch(false);
                var ID = this.generateUUID();

                // Step 1: Create an entry in the ZHISTORYSet
                oModel.create("/ZHISTORYSet", {
                    Id: ID,
                    ParkinglotNumber: sSlotNumber,
                    VehicleNumber: sVehicle,
                    Drivername: sDriverName,
                    Phonenumber: sDriverMobile,
                    TransportType: sTypeofDelivery,
                    Intime: dCheckInTime,
                    Outtime: sOuttime
                }, {
                    success: function () {
                        // Step 2: Delete the selected entry from AssignedSlots
                        oModel.remove(sAssignedSlotPath, {
                            success: function () {
                                sap.m.MessageToast.show("Vehicle unassigned successfully.");
                                oModel.refresh(true);
                                this.updateParkingLotSelect();
                                this._setParkingLotModel(); // Optional: Update the parking lot select control
                            }.bind(this),
                            error: function () {
                                sap.m.MessageBox.error("Error occurred while unassigning the vehicle.");
                            }
                        });
                    }.bind(this),
                    error: function () {
                        sap.m.MessageBox.error("Error occurred while moving the record to history.");
                    }
                });
                const updatedParkingLot = {
                    Status: "Available" // Assuming false represents empty parking
                    // Add other properties if needed
                };
                oModel.update("/zparkinglot1Set('" + sSlotNumber + "')", updatedParkingLot, {
                    success: function () {
                    }.bind(this),
                    error: function (oError) {

                        sap.m.MessageBox.error("Failed to update: " + oError.message);
                    }.bind(this)
                });
            },
            generateUUID: function () {
                debugger
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            },

            printAssignmentDetails: function (oPayload) {
                // Generate QR code data
                var qrData = `${oPayload.vehicleNumber}`;

                // Get current date and time
                var currentDate = new Date().toLocaleDateString();
                var currentTime = new Date().toLocaleTimeString();

                // Create a new window for printing
                var printWindow = window.open('', '', 'height=600,width=800');
                printWindow.document.write('<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>');

                setTimeout(() => {
                    printWindow.document.write('<html><head><title>Print Assigned Details</title>');
                    printWindow.document.write('<style>');
                    printWindow.document.write('body { font-family: Arial, sans-serif; }');
                    printWindow.document.write('.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }');
                    printWindow.document.write('.date-time { display: flex; flex-direction: column; }');
                    printWindow.document.write('.date-time div { margin-bottom: 5px; }');
                    printWindow.document.write('.details-table { width: 100%; border-collapse: collapse; margin-top: 20px; }');
                    printWindow.document.write('.details-table th, .details-table td { border: 1px solid #000; padding: 8px; text-align: left; }');
                    printWindow.document.write('.details-table th { background-color: #f2f2f2; color: #333; }');
                    printWindow.document.write('.details-table td { color: #555; }');
                    printWindow.document.write('.field-cell { background-color: #e0f7fa; color: #00796b; }');
                    printWindow.document.write('.details-cell { background-color: #fffde7; color: #f57f17; }');
                    printWindow.document.write('.qr-container { text-align: right; }');
                    printWindow.document.write('</style>');
                    printWindow.document.write('</head><body>');
                    printWindow.document.write('<div class="print-container">');
                    printWindow.document.write('<h1>Parking-slot Details</h1>');
                    printWindow.document.write('<div class="header">');
                    printWindow.document.write('<div class="date-time">');
                    printWindow.document.write('<div><strong>Date:</strong> ' + currentDate + '</div>');
                    printWindow.document.write('<div><strong>Time:</strong> ' + currentTime + '</div>');
                    printWindow.document.write('</div>');
                    printWindow.document.write('<div class="qr-container"><div id="qrcode"></div></div>');
                    printWindow.document.write('</div>');


                    printWindow.document.write('<table class="details-table">');
                    printWindow.document.write('<tr><th>Field</th><th>Details</th></tr>');
                    printWindow.document.write('<tr><td class="field-cell">Vehicle Number</td><td class="details-cell">' + oPayload.vehicleNumber + '</td></tr>');
                    printWindow.document.write('<tr><td class="field-cell">Driver Name</td><td class="details-cell">' + oPayload.driverName + '</td></tr>');
                    printWindow.document.write('<tr><td class="field-cell">Phone Number</td><td class="details-cell">' + oPayload.phoneNumber + '</td></tr>');
                    printWindow.document.write('<tr><td class="field-cell">Transport Type</td><td class="details-cell">' + oPayload.trasnporTtype + '</td></tr>');
                    printWindow.document.write('<tr><td class="field-cell">Parking Slot Number</td><td class="details-cell">' + oPayload.parkingLotNumber + '</td></tr>');
                    printWindow.document.write('</table>');

                    // Include QRCode library
                    printWindow.document.write('<script>');
                    printWindow.document.write('new QRCode(document.getElementById("qrcode"), { text: "' + qrData + '", width: 100, height: 100 });');
                    printWindow.document.write('</script>');

                    printWindow.document.write('</div>');
                    printWindow.document.write('</body></html>');

                    printWindow.document.close();
                    printWindow.focus();

                    printWindow.print();

                }, 2000);
            },
            onEdit: function () {
                var oTable = this.byId("assignedSlotsTable");
                var aSelectedItems = oTable.getSelectedItems();

                if (aSelectedItems.length === 0) {
                    sap.m.MessageToast.show("Please select an item to edit.");
                    return;
                }
                // Loop through each selected item
                aSelectedItems.forEach(function (oItem) {
                    var aCells = oItem.getCells(); // Get all cells of the selected item
                    var sTransportType = oItem.getBindingContext().getProperty("TransportType"); // Get the Transport Type

                    aCells.forEach(function (oCell) {
                        var aVBoxItems = oCell.getItems(); // Get items inside the VBox

                        if (oCell.getId().includes("_IDassignedSlots6")) {
                            // Hide the Text control and show the Select control for Slot no
                            aVBoxItems[0].setVisible(false); // Hide the Text
                            aVBoxItems[1].setVisible(true); // Show the Select

                            var oSelect = aVBoxItems[1]; // Select control
                            var oBinding = oSelect.getBinding("items");

                            // Create a filter for the TransportType
                            var oFilter = new sap.ui.model.Filter({
                                path: "TransportType", // Assuming SlotType indicates whether it's 'Inward' or 'Outward'
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: sTransportType
                            });

                            // Apply the filter to the Select control
                            oBinding.filter([oFilter]);
                        }
                    });
                });

                this.isEditMode = true;
                this.byId("_IDGenButton3").setVisible(false); // Hide Edit Button
                this.byId("_IDGenButtonsave").setVisible(true); // Show Save Button
                this.byId("_IDGenButtoncancel").setVisible(true); // Show Cancel Button
            },
            oncancel: function () {
                var oTable = this.byId("assignedSlotsTable");
                var aItems = oTable.getItems();

                // Loop through each item in the table
                aItems.forEach(function (oItem) {
                    var aCells = oItem.getCells(); // Get all cells of the item
                    aCells.forEach(function (oCell) {
                        var aVBoxItems = oCell.getItems(); // Get items inside the VBox

                        if (oCell.getId().includes("_IDassignedSlots6")) {
                            // Revert to the original state for Slot no
                            aVBoxItems[0].setVisible(true); // Show the Text
                            aVBoxItems[1].setVisible(false); // Hide the Select
                        }
                    });
                });

                // Exit Edit Mode
                this.isEditMode = false;
                this.byId("_IDGenButton3").setVisible(true); // Show Edit Button
                this.byId("_IDGenButtonsave").setVisible(false); // Hide Save Button
                this.byId("_IDGenButtoncancel").setVisible(false); // Hide Cancel Button
            },
            onSave: function () {
                var oTable = this.byId("assignedSlotsTable");
                var aSelectedItems = oTable.getSelectedItems();
                var oModel = this.getView().getModel();

                if (aSelectedItems.length === 0) {
                    sap.m.MessageToast.show("Please select an item to save.");
                    return;
                }

                // Loop through each selected item
                aSelectedItems.forEach(function (oItem) {
                    var oContext = oItem.getBindingContext();
                    var sPath = oContext.getPath(); // Get the binding path for the selected item
                    var aCells = oItem.getCells();

                    var sOldParkingLotNumber = oContext.getProperty("ParkinglotNumber");
                    var sSelectedParkingLotNumber = "";

                    // Find the dropdown cell and get the selected key
                    aCells.forEach(function (oCell) {
                        if (oCell.getId().includes("_IDassignedSlots6")) {
                            var aVBoxItems = oCell.getItems();
                            sSelectedParkingLotNumber = aVBoxItems[1].getSelectedKey();

                            // Hide the Select and show the Text after saving
                            aVBoxItems[0].setText(sSelectedParkingLotNumber);  // Update the Text control with the selected value
                            aVBoxItems[0].setVisible(true);  // Show the Text
                            aVBoxItems[1].setVisible(false); // Hide the Select
                        }
                    });

                    // Prepare the data to update the assigned slot
                    var oData = {
                        ParkinglotNumber: sSelectedParkingLotNumber
                    };

                    // Update the OData entry
                    oModel.update(sPath, oData, {
                        success: function () {
                            sap.m.MessageBox.success("Successfully Updated!");

                            // Update the status of the new parking lot to "Occupied"
                            oModel.update("/zparkinglot1Set('" + sSelectedParkingLotNumber + "')", { Status: "Occupied" }, {
                                success: function () {
                                    oModel.update("/zparkinglot1Set('" + sOldParkingLotNumber + "')", { Status: "Available" }, {
                                        success() {
                                        },
                                        error() {
                                        }
                                    });
                                },
                                error: function () {
                                    sap.m.MessageBox.error("Error Exists");
                                }
                            });
                        },
                        error: function () {
                            sap.m.MessageBox.error("Error Exists");
                        }
                    });
                });
                // Exit Edit Mode
                this.isEditMode = false;
                this.byId("_IDGenButton3").setVisible(true); // Show Edit Button
                this.byId("_IDGenButtonsave").setVisible(false); // Hide Save Button
                this.byId("_IDGenButtoncancel").setVisible(false); // Hide Cancel Button
            },
            onAssignPress: async function () {
                var oSelected = this.byId("idReserveSlotsTable").getSelectedItem();

                if (!oSelected) {
                    sap.m.MessageToast.show("Please select a vehicle to assign");
                    return;
                }
                var sVehicle = oSelected.getBindingContext().getObject().VehicleNumber;
                var sSlotNumber = oSelected.getBindingContext().getObject().ParkinglotNumber;
                var sDriverName = oSelected.getBindingContext().getObject().Drivername;
                var sTypeofDelivery = oSelected.getBindingContext().getObject().TransportType;
                var sDriverMobile = oSelected.getBindingContext().getObject().Phonenumber;
                var sAssignedSlotPath = oSelected.getBindingContext().getPath(); // Get the path to the selected entry

                var oCurrentDateTime = new Date();
                var sYear = oCurrentDateTime.getFullYear();
                var sMonth = ("0" + (oCurrentDateTime.getMonth() + 1)).slice(-2);
                var sDay = ("0" + oCurrentDateTime.getDate()).slice(-2);
                var sHours = ("0" + oCurrentDateTime.getHours()).slice(-2);
                var sMinutes = ("0" + oCurrentDateTime.getMinutes()).slice(-2);
                var sSeconds = ("0" + oCurrentDateTime.getSeconds()).slice(-2);

                // Construct the inTime string in YYYY-MM-DD HH:MM:SS format
                var sIntime = `${sYear}-${sMonth}-${sDay} ${sHours}:${sMinutes}:${sSeconds}`;

                var oModel = this.getView().getModel();
                oModel.setUseBatch(false);
                var ID = this.generateUUID();

                // Step 1: Create an entry in the ZHISTORYSet
                oModel.create("/ZASSIGNEDSet", {
                    Id: ID,
                    ParkinglotNumber: sSlotNumber,
                    VehicleNumber: sVehicle,
                    Drivername: sDriverName,
                    Phonenumber: sDriverMobile,
                    TransportType: sTypeofDelivery,
                    Intime: sIntime
                }, {
                    success: function () {
                        // Step 2: Delete the selected entry from AssignedSlots
                        oModel.remove(sAssignedSlotPath, {
                            success: function () {
                                sap.m.MessageToast.show("Vehicle assigned successfully.");
                                oModel.refresh(true);
                                this.updateParkingLotSelect();
                                this._setParkingLotModel(); // Optional: Update the parking lot select control
                            }.bind(this),
                            error: function () {
                                sap.m.MessageBox.error("Error occurred while assigning the vehicle.");
                            }
                        });
                    }.bind(this),
                    error: function () {
                        sap.m.MessageBox.error("Error occurred while moving the record");
                    }
                });
                const updatedParkingLot = {
                    Status: "Occupied" // Assuming false represents empty parking
                    // Add other properties if needed
                };
                oModel.update("/zparkinglot1Set('" + sSlotNumber + "')", updatedParkingLot, {
                    success: function () {
                    }.bind(this),
                    error: function (oError) {

                        sap.m.MessageBox.error("Failed to update: " + oError.message);
                    }.bind(this)
                });
            },
            generateUUID: function () {
                debugger
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            },
            onRejectPress: async function () {
                const oTable = this.byId("idReserveSlotsTable");
                const aSelectedItems = oTable.getSelectedItems();

                if (aSelectedItems.length === 0) {
                    sap.m.MessageToast.show("Please select at least one item to reject.");
                    return;
                }

                const oModel = this.getView().getModel();
                const aPromises = [];

                aSelectedItems.forEach(function (oItem) {
                    const sPath = oItem.getBindingContext().getPath();
                    aPromises.push(
                        new Promise((resolve, reject) => {
                            oModel.remove(sPath, {
                                success: resolve,
                                error: function (oError) {
                                    sap.m.MessageBox.error("Failed to reject: " + oError.message);
                                    reject(oError);
                                }
                            });
                        })
                    );
                });

                try {
                    await Promise.all(aPromises);
                    sap.m.MessageToast.show("Selected items were successfully rejected.");
                    oModel.refresh(true); // Refresh the model to update the table
                } catch (error) {
                    console.error("Error during rejection:", error);
                }
            },
            onNotificationPress: function (oEvent) {
                var oButton = oEvent.getSource(),
                    oView = this.getView();

                // create popover
                if (!this._pPopover) {
                    this._pPopover = this.loadFragment("Notification").then(function (oPopover) {
                        oView.addDependent(oPopover);
                        oPopover.bindElement("");
                        return oPopover;
                    });
                }
                this._pPopover.then(function (oPopover) {
                    oPopover.openBy(oButton);
                    this.refreshNotificationList();
                });
            },
            refreshNotificationList: function() {
                var oModel = this.getView().getModel(); // Adjust to get your model
                var oNotificationList = this.byId("Notification1");
            
                // Refresh the model data
                oModel.refresh(); // Refresh the entire model
            
                // Alternatively, if you need to refresh a specific binding:
                var oBinding = oNotificationList.getBinding("items");
                if (oBinding) {
                    oBinding.refresh(); // Refresh specific binding
                }
            },
            _updateNotificationCount: function () {
                var oModel = this.getView().getModel();
                var that = this;

                // Fetch a limited number of entities from NotifySet
                oModel.read("/ZRESERVESet", {
                    urlParameters: {
                        "$top": 1 // Fetch a small number of records
                    },
                    success: function (oData) {
                        // Count the number of fetched records
                        var count = oData.results.length;
                        // Update the BadgeCustomData value
                        var oBadge = that.byId("IDNotificationCount");
                        if (oBadge) {
                            oBadge.setValue(count.toString());
                        }
                    },
                    error: function (oError) {
                        // Handle error scenario
                        console.error("Error fetching NotifySet data: ", oError);
                    }
                });
            },
            onLiveSearchAllocatedPress: async function (oEvent) {
                debugger
                var sQuery = oEvent.getParameter("newValue").trim();
                var oList = this.byId("allSlotsTable"); // Assuming this is your History table ID

                //First getting data from OData...
                try {
                    var oModel = this.getView().getModel(); // Assuming the model is bound to the view
                    var sPath = "/zparkinglot1Set"; // Your EntitySet path

                    // Fetch the data from the OData service
                    var aAllData = await new Promise((resolve, reject) => {
                        oModel.read(sPath, {
                            success: function (oData) {
                                resolve(oData.results);
                            },
                            error: function (oError) {
                                console.error("Failed to fetch all data:", oError);
                                reject(oError);
                            }
                        });
                    });

                    // If there's a search query, filter the data based on the query
                    var aFilteredData;
                    if (sQuery) {
                        aFilteredData = aAllData.filter(function (oItem) {
                            return (oItem.ParkinglotNumber && oItem.ParkinglotNumber.includes(sQuery)) ||
                                (oItem.Status && oItem.Status.includes(sQuery))
                        });
                    } else {
                        aFilteredData = aAllData; // No search query, use all data
                    }

                    // Create a new JSON model with the filtered data
                    var oFilteredModel = new sap.ui.model.json.JSONModel(aFilteredData);

                    // Bind the filtered model to the table
                    oList.setModel(oFilteredModel);
                    oList.bindItems({
                        path: "/",
                        template: oList.getBindingInfo("items").template
                    });

                } catch (error) {
                    console.error("Error fetching or filtering data:", error);
                }
            },
            handlerSearchFieldLiveEvent: async function (oEvent) {
                var sQuery = oEvent.getParameter("newValue").trim();
                var oList = this.byId("assignedSlotsTable"); // Assuming this is your History table ID

                //First getting data from OData...
                try {
                    var oModel = this.getView().getModel(); // Assuming the model is bound to the view
                    var sPath = "/ZASSIGNEDSet"; // Your EntitySet path

                    // Fetch the data from the OData service
                    var aAllData = await new Promise((resolve, reject) => {
                        oModel.read(sPath, {
                            success: function (oData) {
                                resolve(oData.results);
                            },
                            error: function (oError) {
                                console.error("Failed to fetch all data:", oError);
                                reject(oError);
                            }
                        });
                    });

                    // If there's a search query, filter the data based on the query
                    var aFilteredData;
                    if (sQuery) {
                        aFilteredData = aAllData.filter(function (oItem) {
                            return (oItem.ParkinglotNumber && oItem.ParkinglotNumber.includes(sQuery)) ||
                                (oItem.TransportType && oItem.TransportType.includes(sQuery)) ||
                                (oItem.VehicleNumber && oItem.VehicleNumber.includes(sQuery)) ||
                                (oItem.Phonenumber && oItem.Phonenumber.includes(sQuery)) ||
                                (oItem.Drivername && oItem.Drivername.includes(sQuery)) ||
                                (oItem.Intime && oItem.Intime.includes(sQuery))
                        });
                    } else {
                        aFilteredData = aAllData; // No search query, use all data
                    }

                    // Create a new JSON model with the filtered data
                    var oFilteredModel = new sap.ui.model.json.JSONModel(aFilteredData);

                    // Bind the filtered model to the table
                    oList.setModel(oFilteredModel);
                    oList.bindItems({
                        path: "/",
                        template: oList.getBindingInfo("items").template
                    });

                } catch (error) {
                    console.error("Error fetching or filtering data:", error);
                }
            },
            handlerSearchFieldLiveEventHistory: async function (oEvent) {
                var sQuery = oEvent.getParameter("newValue").trim();
                var oList = this.byId("historyTable"); // Assuming this is your History table ID

                //First getting data from OData...
                try {
                    var oModel = this.getView().getModel(); // Assuming the model is bound to the view
                    var sPath = "/ZHISTORYSet"; // Your EntitySet path

                    // Fetch the data from the OData service
                    var aAllData = await new Promise((resolve, reject) => {
                        oModel.read(sPath, {
                            success: function (oData) {
                                resolve(oData.results);
                            },
                            error: function (oError) {
                                console.error("Failed to fetch all data:", oError);
                                reject(oError);
                            }
                        });
                    });

                    // If there's a search query, filter the data based on the query
                    var aFilteredData;
                    if (sQuery) {
                        aFilteredData = aAllData.filter(function (oItem) {
                            return (oItem.ParkinglotNumber && oItem.ParkinglotNumber.includes(sQuery)) ||
                                (oItem.TransportType && oItem.TransportType.includes(sQuery)) ||
                                (oItem.VehicleNumber && oItem.VehicleNumber.includes(sQuery)) ||
                                (oItem.Phonenumber && oItem.Phonenumber.includes(sQuery)) ||
                                (oItem.Drivername && oItem.Drivername.includes(sQuery)) ||
                                (oItem.Intime && oItem.Intime.includes(sQuery)) ||
                                (oItem.Outtime && oItem.Outtime.includes(sQuery))
                        });
                    } else {
                        aFilteredData = aAllData; // No search query, use all data
                    }

                    // Create a new JSON model with the filtered data
                    var oFilteredModel = new sap.ui.model.json.JSONModel(aFilteredData);

                    // Bind the filtered model to the table
                    oList.setModel(oFilteredModel);
                    oList.bindItems({
                        path: "/",
                        template: oList.getBindingInfo("items").template
                    });

                } catch (error) {
                    console.error("Error fetching or filtering data:", error);
                }
            },
            updateSoltsStatusbyDate: function () {
                debugger
                const oThis = this;
                let currentDate = new Date();
                let year = currentDate.getFullYear();
                let month = String(currentDate.getMonth() + 1).padStart(2, '0');
                let day = String(currentDate.getDate()).padStart(2, '0');
                const currentDay = `${year}-${month}-${day}`;
 
                const oModel = this.getView().getModel();
 
                if (!oModel) {
                    // MessageToast.show("Model is not defined");
                    console.log("error")
                    return;
                }
                oModel.read("/ZRESERVESet", {
                    success: function (oData, resp) {
                        if (oData.results.length > 0) {
                            oData.results.forEach((element) => {
                                var oReservedDate = element.ReserveTime
                                if (oReservedDate === currentDay) {
                                    var oReservedSlot = element.ParkinglotNumber
                                    const ofilter = new Filter("ParkinglotNumber", FilterOperator.EQ, oReservedSlot)
                                    oModel.update(`/zparkinglot1Set('${oReservedSlot}')`, { Status: "Reserved" }, {
                                        success: function () {
                                        },
                                        error: function () {
                                        }
                                    })
                                }
                            })
                        } else {
                        }
                    },
                    error: function () {
                    }
                })
            },
        });
    });
