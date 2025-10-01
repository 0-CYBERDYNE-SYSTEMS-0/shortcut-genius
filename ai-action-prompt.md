# iOS Shortcuts Complete Action Database

This database contains 185 verified iOS Shortcut actions with detailed parameter specifications.

## Usage Guidelines:
1. Use only action identifiers listed below
2. Include all required parameters for each action
3. Use appropriate default values for optional parameters
4. Consider permission requirements when designing shortcuts
5. Match input/output types between connected actions

## TEXT ACTIONS (9)

### Text
**Identifier**: `is.workflow.actions.gettext`
**Description**: Displays text on the screen
**Confidence**: low
**Parameters**:
- `WFTextActionText` (string) - **REQUIRED** - Default: `Hello World!`
  - The text to display
**Output Types**: WFStringContentItem
**Related Actions**: `is.workflow.actions.ask`, `is.workflow.actions.getclipboard`
**Alternatives**: `is.workflow.actions.ask`

### Gettextfrominput
**Identifier**: `is.workflow.actions.gettextfrominput`
**Description**: Action: Gettextfrominput
**Confidence**: low
**Parameters**: None
**Input Types**: WFStringContentItem
**Output Types**: WFStringContentItem

### Matchtext
**Identifier**: `is.workflow.actions.matchtext`
**Description**: Action: Matchtext
**Confidence**: low
**Parameters**:
- `WFTextActionText` (string) - **REQUIRED** - Default: ``
  - The text to display or process
**Input Types**: WFStringContentItem

### Replacetext
**Identifier**: `is.workflow.actions.replacetext`
**Description**: Action: Replacetext
**Confidence**: low
**Parameters**:
- `WFTextActionText` (string) - **REQUIRED** - Default: ``
  - The text to display or process
**Input Types**: WFStringContentItem

### Splittext
**Identifier**: `is.workflow.actions.splittext`
**Description**: Action: Splittext
**Confidence**: low
**Parameters**:
- `WFTextActionText` (string) - **REQUIRED** - Default: ``
  - The text to display or process
**Input Types**: WFStringContentItem

### Combinetext
**Identifier**: `is.workflow.actions.combinetext`
**Description**: Action: Combinetext
**Confidence**: low
**Parameters**:
- `WFTextActionText` (string) - **REQUIRED** - Default: ``
  - The text to display or process
**Input Types**: WFStringContentItem

### Translatetext
**Identifier**: `is.workflow.actions.translatetext`
**Description**: Action: Translatetext
**Confidence**: low
**Parameters**:
- `WFTextActionText` (string) - **REQUIRED** - Default: ``
  - The text to display or process
**Input Types**: WFStringContentItem

### Textrecognition
**Identifier**: `is.workflow.actions.textrecognition`
**Description**: Action: Textrecognition
**Confidence**: low
**Parameters**:
- `WFTextActionText` (string) - **REQUIRED** - Default: ``
  - The text to display or process
**Input Types**: WFStringContentItem

### Scenetextrecognition
**Identifier**: `is.workflow.actions.scenetextrecognition`
**Description**: Action: Scenetextrecognition
**Confidence**: low
**Parameters**:
- `WFTextActionText` (string) - **REQUIRED** - Default: ``
  - The text to display or process
**Input Types**: WFStringContentItem

## NOTIFICATION ACTIONS (1)

### Show Notification
**Identifier**: `is.workflow.actions.notification`
**Description**: Displays a notification
**Confidence**: low
**Parameters**:
- `WFNotificationActionTitle` (string) - Default: `Shortcut`
  - Notification title
- `WFNotificationActionBody` (string) - **REQUIRED** - Default: ``
  - Notification message
- `WFNotificationActionSound` (boolean) - Default: `false`
  - Play notification sound
- `WFConditionalActionCondition` (object) - **REQUIRED**
  - Condition to evaluate
**Permissions**: notification
**Related Actions**: `is.workflow.actions.speak`, `is.workflow.actions.showresult`
**Alternatives**: `is.workflow.actions.speak`

## WEB ACTIONS (5)

### Open URL
**Identifier**: `is.workflow.actions.url`
**Description**: Opens a URL in the default browser
**Confidence**: low
**Parameters**:
- `WFURLActionURL` (string) - **REQUIRED** - Validation: pattern: ^https?://.+
  - URL to open
**Input Types**: WFURLContentItem
**Related Actions**: `is.workflow.actions.getcontentsofurl`
**Alternatives**: `is.workflow.actions.getcontentsofurl`

### Getcontentsofurl
**Identifier**: `is.workflow.actions.getcontentsofurl`
**Description**: Action: Getcontentsofurl
**Confidence**: low
**Parameters**:
- `WFURLActionURL` (string) - **REQUIRED** - Validation: pattern: ^https?://.+
  - URL to open
**Input Types**: WFURLContentItem
**Output Types**: any

### Downloadurl
**Identifier**: `is.workflow.actions.downloadurl`
**Description**: Action: Downloadurl
**Confidence**: low
**Parameters**:
- `WFURLActionURL` (string) - **REQUIRED** - Validation: pattern: ^https?://.+
  - URL to open
**Input Types**: WFURLContentItem

### Expandurl
**Identifier**: `is.workflow.actions.expandurl`
**Description**: Action: Expandurl
**Confidence**: low
**Parameters**:
- `WFURLActionURL` (string) - **REQUIRED** - Validation: pattern: ^https?://.+
  - URL to open
**Input Types**: WFURLContentItem

### Getcomponentsfromurl
**Identifier**: `is.workflow.actions.getcomponentsfromurl`
**Description**: Action: Getcomponentsfromurl
**Confidence**: low
**Parameters**:
- `WFURLActionURL` (string) - **REQUIRED** - Validation: pattern: ^https?://.+
  - URL to open
**Input Types**: WFURLContentItem
**Output Types**: any

## SCRIPTING ACTIONS (63)

### Wait
**Identifier**: `is.workflow.actions.wait`
**Description**: Waits for a specified duration
**Confidence**: low
**Parameters**:
- `WFWaitActionWaitTime` (number) - **REQUIRED** - Default: `1` - Validation: min: 0, max: 3600
  - Time to wait in seconds

### Set Variable
**Identifier**: `is.workflow.actions.setvariable`
**Description**: Sets a variable to a value
**Confidence**: low
**Parameters**:
- `WFVariableName` (string) - **REQUIRED** - Default: `Variable`
  - Variable name
- `WFVariableInput` (any) - **REQUIRED**
  - Variable value
**Input Types**: any
**Output Types**: any
**Related Actions**: `is.workflow.actions.getvariable`, `is.workflow.actions.calculate`

### Get Variable
**Identifier**: `is.workflow.actions.getvariable`
**Description**: Gets the value of a variable
**Confidence**: low
**Parameters**:
- `WFVariableName` (string) - **REQUIRED** - Default: `Variable`
  - Variable name
**Output Types**: any

### If
**Identifier**: `is.workflow.actions.conditional`
**Description**: Performs actions conditionally
**Confidence**: low
**Parameters**:
- `WFConditionalActionCondition` (object) - **REQUIRED**
  - Condition to evaluate
**Input Types**: any
**Output Types**: any
**Related Actions**: `is.workflow.actions.repeat`

### Repeat
**Identifier**: `is.workflow.actions.repeat`
**Description**: Repeats actions multiple times
**Confidence**: low
**Parameters**:
- `WFRepeatActionCount` (number) - **REQUIRED** - Default: `1` - Validation: min: 1, max: 1000
  - Number of times to repeat
- `WFRepeatActionTime` (number) - Validation: min: 1, max: 3600
  - Repeat for this many seconds (optional)
**Input Types**: any
**Output Types**: any

### Ask for Input
**Identifier**: `is.workflow.actions.ask`
**Description**: Asks the user for input
**Confidence**: low
**Parameters**:
- `WFAskActionPrompt` (string) - **REQUIRED** - Default: `Enter input:`
  - Prompt text to show user
- `WFAskActionDefaultAnswer` (string) - Default: ``
  - Default answer
**Output Types**: WFStringContentItem

### Show Result
**Identifier**: `is.workflow.actions.showresult`
**Description**: Shows the result of previous actions
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Comment
**Identifier**: `is.workflow.actions.comment`
**Description**: Adds a comment to the shortcut
**Confidence**: low
**Parameters**:
- `WFCommentActionText` (string) - **REQUIRED** - Default: `Comment`
  - Comment text

### Exit Shortcut
**Identifier**: `is.workflow.actions.exit`
**Description**: Exits the shortcut immediately
**Confidence**: low
**Parameters**: None

### Show Alert
**Identifier**: `is.workflow.actions.showalert`
**Description**: Shows an alert dialog with options
**Confidence**: low
**Parameters**:
- `WFAlertActionTitle` (string) - **REQUIRED** - Default: `Alert`
  - Alert title
- `WFAlertActionMessage` (string) - **REQUIRED** - Default: `Message`
  - Alert message

### Getfile
**Identifier**: `is.workflow.actions.getfile`
**Description**: Action: Getfile
**Confidence**: low
**Parameters**: None
**Input Types**: WFGenericFileContentItem
**Output Types**: WFGenericFileContentItem

### Getcontentsoffile
**Identifier**: `is.workflow.actions.getcontentsoffile`
**Description**: Action: Getcontentsoffile
**Confidence**: low
**Parameters**: None
**Input Types**: WFGenericFileContentItem
**Output Types**: WFGenericFileContentItem

### Getcontentsofspreadsheet
**Identifier**: `is.workflow.actions.getcontentsofspreadsheet`
**Description**: Action: Getcontentsofspreadsheet
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Output Types**: any

### Setspreadsheetcell
**Identifier**: `is.workflow.actions.setspreadsheetcell`
**Description**: Action: Setspreadsheetcell
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Getcalendarevents
**Identifier**: `is.workflow.actions.getcalendarevents`
**Description**: Action: Getcalendarevents
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Output Types**: any

### Modifycalendarevents
**Identifier**: `is.workflow.actions.modifycalendarevents`
**Description**: Action: Modifycalendarevents
**Confidence**: low
**Parameters**:
- `WFConditionalActionCondition` (object) - **REQUIRED**
  - Condition to evaluate
**Input Types**: any

### Getreminders
**Identifier**: `is.workflow.actions.getreminders`
**Description**: Action: Getreminders
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Output Types**: any

### Modifyreminders
**Identifier**: `is.workflow.actions.modifyreminders`
**Description**: Action: Modifyreminders
**Confidence**: low
**Parameters**:
- `WFConditionalActionCondition` (object) - **REQUIRED**
  - Condition to evaluate
**Input Types**: any

### Getcontactdetails
**Identifier**: `is.workflow.actions.getcontactdetails`
**Description**: Action: Getcontactdetails
**Confidence**: low
**Parameters**: None
**Input Types**: WFContactContentItem
**Output Types**: WFContactContentItem
**Permissions**: contacts

### Modifycontact
**Identifier**: `is.workflow.actions.modifycontact`
**Description**: Action: Modifycontact
**Confidence**: low
**Parameters**:
- `WFConditionalActionCondition` (object) - **REQUIRED**
  - Condition to evaluate
**Input Types**: WFContactContentItem
**Permissions**: contacts

### Gethealthsample
**Identifier**: `is.workflow.actions.gethealthsample`
**Description**: Action: Gethealthsample
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Output Types**: any
**Permissions**: health

### Gethealthquantitytype
**Identifier**: `is.workflow.actions.gethealthquantitytype`
**Description**: Action: Gethealthquantitytype
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Output Types**: any
**Permissions**: health

### Gethomeaccessorystate
**Identifier**: `is.workflow.actions.gethomeaccessorystate`
**Description**: Action: Gethomeaccessorystate
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Output Types**: any
**Permissions**: home

### Gethomeroomstate
**Identifier**: `is.workflow.actions.gethomeroomstate`
**Description**: Action: Gethomeroomstate
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Output Types**: any
**Permissions**: home

### Getdirections
**Identifier**: `is.workflow.actions.getdirections`
**Description**: Action: Getdirections
**Confidence**: low
**Parameters**:
- `WFDirectionsActionDestination` (any) - **REQUIRED**
  - Destination location
- `WFDirectionsActionTransportType` (string) - **REQUIRED** - Default: `driving` - Options: `driving`, `walking`, `transit`
  - Transportation method
- `WFDirectionsActionShowRoute` (boolean) - Default: `true`
  - Show route in Maps
**Input Types**: any
**Output Types**: any

### Getdistancetravelled
**Identifier**: `is.workflow.actions.getdistancetravelled`
**Description**: Action: Getdistancetravelled
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Output Types**: any

### Gettraveltime
**Identifier**: `is.workflow.actions.gettraveltime`
**Description**: Action: Gettraveltime
**Confidence**: low
**Parameters**: None
**Input Types**: WFDateContentItem
**Output Types**: any

### Getcurrentsong
**Identifier**: `is.workflow.actions.getcurrentsong`
**Description**: Action: Getcurrentsong
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Output Types**: any

### Getvolume
**Identifier**: `is.workflow.actions.getvolume`
**Description**: Action: Getvolume
**Confidence**: low
**Parameters**:
- `WFSetValue` (number) - **REQUIRED** - Validation: min: 0, max: 100
  - Volume level (0-100)
**Input Types**: any
**Output Types**: any
**Permissions**: device

### Setvolume
**Identifier**: `is.workflow.actions.setvolume`
**Description**: Action: Setvolume
**Confidence**: low
**Parameters**:
- `WFSetValue` (number) - **REQUIRED** - Validation: min: 0, max: 100
  - Volume level (0-100)
**Input Types**: any
**Permissions**: device

### Getlatestphotos
**Identifier**: `is.workflow.actions.getlatestphotos`
**Description**: Action: Getlatestphotos
**Confidence**: low
**Parameters**: None
**Input Types**: WFImageContentItem
**Output Types**: any
**Permissions**: camera

### Getlatestvideos
**Identifier**: `is.workflow.actions.getlatestvideos`
**Description**: Action: Getlatestvideos
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Output Types**: any

### Getimagesfrominput
**Identifier**: `is.workflow.actions.getimagesfrominput`
**Description**: Action: Getimagesfrominput
**Confidence**: low
**Parameters**: None
**Input Types**: WFImageContentItem
**Output Types**: WFImageContentItem

### Makegif
**Identifier**: `is.workflow.actions.makegif`
**Description**: Action: Makegif
**Confidence**: low
**Parameters**:
- `WFConditionalActionCondition` (object) - **REQUIRED**
  - Condition to evaluate
**Input Types**: any

### Getrssfeed
**Identifier**: `is.workflow.actions.getrssfeed`
**Description**: Action: Getrssfeed
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Output Types**: any

### Getarticle
**Identifier**: `is.workflow.actions.getarticle`
**Description**: Action: Getarticle
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Output Types**: any

### Setairplanemode
**Identifier**: `is.workflow.actions.setairplanemode`
**Description**: Action: Setairplanemode
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Setbluetooth
**Identifier**: `is.workflow.actions.setbluetooth`
**Description**: Action: Setbluetooth
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Permissions**: device

### Setwifi
**Identifier**: `is.workflow.actions.setwifi`
**Description**: Action: Setwifi
**Confidence**: low
**Parameters**:
- `WFConditionalActionCondition` (object) - **REQUIRED**
  - Condition to evaluate
**Input Types**: any
**Permissions**: device

### Setcellulardata
**Identifier**: `is.workflow.actions.setcellulardata`
**Description**: Action: Setcellulardata
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Setlowpowermode
**Identifier**: `is.workflow.actions.setlowpowermode`
**Description**: Action: Setlowpowermode
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Setflashlight
**Identifier**: `is.workflow.actions.setflashlight`
**Description**: Action: Setflashlight
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Getbatterylevel
**Identifier**: `is.workflow.actions.getbatterylevel`
**Description**: Action: Getbatterylevel
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Output Types**: any

### Getdevicedetails
**Identifier**: `is.workflow.actions.getdevicedetails`
**Description**: Action: Getdevicedetails
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Output Types**: any
**Permissions**: device

### Getnetworkdetails
**Identifier**: `is.workflow.actions.getnetworkdetails`
**Description**: Action: Getnetworkdetails
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Output Types**: any

### Getscreenbrightness
**Identifier**: `is.workflow.actions.getscreenbrightness`
**Description**: Action: Getscreenbrightness
**Confidence**: low
**Parameters**:
- `WFSetValue` (number) - **REQUIRED** - Validation: min: 0, max: 100
  - Brightness level (0-100)
**Input Types**: any
**Output Types**: any
**Permissions**: device

### Setsilentmode
**Identifier**: `is.workflow.actions.setsilentmode`
**Description**: Action: Setsilentmode
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Runscript
**Identifier**: `is.workflow.actions.runscript`
**Description**: Action: Runscript
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Runjavascript
**Identifier**: `is.workflow.actions.runjavascript`
**Description**: Action: Runjavascript
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Runshellscript
**Identifier**: `is.workflow.actions.runshellscript`
**Description**: Action: Runshellscript
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Evaluatescript
**Identifier**: `is.workflow.actions.evaluatescript`
**Description**: Action: Evaluatescript
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Getbarcode
**Identifier**: `is.workflow.actions.getbarcode`
**Description**: Action: Getbarcode
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Output Types**: any

### Classifyimage
**Identifier**: `is.workflow.actions.classifyimage`
**Description**: Action: Classifyimage
**Confidence**: low
**Parameters**:
- `WFConditionalActionCondition` (object) - **REQUIRED**
  - Condition to evaluate
**Input Types**: WFImageContentItem

### Gettype
**Identifier**: `is.workflow.actions.gettype`
**Description**: Action: Gettype
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Output Types**: any

### Getvalueforkey
**Identifier**: `is.workflow.actions.getvalueforkey`
**Description**: Action: Getvalueforkey
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Output Types**: any

### Setvalueforkey
**Identifier**: `is.workflow.actions.setvalueforkey`
**Description**: Action: Setvalueforkey
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Getdictionaryvalue
**Identifier**: `is.workflow.actions.getdictionaryvalue`
**Description**: Action: Getdictionaryvalue
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Output Types**: any

### Setdictionaryvalue
**Identifier**: `is.workflow.actions.setdictionaryvalue`
**Description**: Action: Setdictionaryvalue
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Getlistitem
**Identifier**: `is.workflow.actions.getlistitem`
**Description**: Action: Getlistitem
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Output Types**: any

### Getpaymentdetails
**Identifier**: `is.workflow.actions.getpaymentdetails`
**Description**: Action: Getpaymentdetails
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Output Types**: any

### Getpaymentmethod
**Identifier**: `is.workflow.actions.getpaymentmethod`
**Description**: Action: Getpaymentmethod
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Output Types**: any

### Choose from List
**Identifier**: `is.workflow.actions.choosefromlist`
**Description**: Presents a list for user to choose from
**Confidence**: high
**Parameters**:
- `WFChooseFromListActionPrompt` (string) - **REQUIRED** - Default: `Choose an item:`
  - Prompt text
- `WFChooseFromListActionList` (array) - **REQUIRED**
  - List of items to choose from
**Input Types**: any
**Output Types**: any

### Do Nothing
**Identifier**: `is.workflow.actions.nothing`
**Description**: Performs no action
**Confidence**: high
**Parameters**: None

## MEDIA ACTIONS (8)

### Speak Text
**Identifier**: `is.workflow.actions.speak`
**Description**: Speaks text using text-to-speech
**Confidence**: low
**Parameters**:
- `WFSpeakTextActionText` (string) - **REQUIRED** - Default: `Hello World!`
  - Text to speak aloud
- `WFSpeakTextActionLanguage` (string) - Default: `en-US` - Options: `en-US`, `es-ES`, `fr-FR`, `de-DE`, `it-IT`, `ja-JP`, `zh-CN`, `ko-KR`
  - Language code for speech synthesis
- `WFSpeakTextActionPitch` (number) - Default: `1` - Validation: min: 0.5, max: 2
  - Voice pitch multiplier
- `WFSpeakTextActionRate` (number) - Default: `1` - Validation: min: 0.5, max: 2
  - Speech rate multiplier
**Input Types**: WFStringContentItem
**Permissions**: media
**Related Actions**: `is.workflow.actions.notification`, `is.workflow.actions.showresult`

### Playmusic
**Identifier**: `is.workflow.actions.playmusic`
**Description**: Action: Playmusic
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Pausemusic
**Identifier**: `is.workflow.actions.pausemusic`
**Description**: Action: Pausemusic
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Skipmusic
**Identifier**: `is.workflow.actions.skipmusic`
**Description**: Action: Skipmusic
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Getmusiclibrary
**Identifier**: `is.workflow.actions.getmusiclibrary`
**Description**: Action: Getmusiclibrary
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Output Types**: any

### Addtoplaylist
**Identifier**: `is.workflow.actions.addtoplaylist`
**Description**: Action: Addtoplaylist
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Createplaylist
**Identifier**: `is.workflow.actions.createplaylist`
**Description**: Action: Createplaylist
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Recordaudio
**Identifier**: `is.workflow.actions.recordaudio`
**Description**: Action: Recordaudio
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Permissions**: microphone

## CLIPBOARD ACTIONS (3)

### Copy to Clipboard
**Identifier**: `is.workflow.actions.copy`
**Description**: Copies content to the clipboard
**Confidence**: low
**Parameters**:
- `WFCopyActionCopyText` (any) - **REQUIRED**
  - Content to copy
**Input Types**: WFStringContentItem, WFURLContentItem, WFImageContentItem

### Get Clipboard
**Identifier**: `is.workflow.actions.getclipboard`
**Description**: Gets content from the clipboard
**Confidence**: low
**Parameters**: None
**Output Types**: any

### Copyfile
**Identifier**: `is.workflow.actions.copyfile`
**Description**: Action: Copyfile
**Confidence**: low
**Parameters**: None
**Input Types**: WFGenericFileContentItem

## LOCATION ACTIONS (4)

### Get Current Location
**Identifier**: `is.workflow.actions.getcurrentlocation`
**Description**: Gets the device's current location
**Confidence**: low
**Parameters**: None
**Output Types**: WFLocationContentItem
**Permissions**: location

### Get Current Weather
**Identifier**: `is.workflow.actions.getcurrentweather`
**Description**: Gets current weather conditions
**Confidence**: low
**Parameters**:
- `WFWeatherActionLocation` (any)
  - Location to get weather for (defaults to current location)
- `WFWeatherActionUnits` (string) - Default: `auto` - Options: `auto`, `celsius`, `fahrenheit`
  - Temperature units
**Output Types**: WFWeatherContentItem
**Permissions**: location

### Searchformaps
**Identifier**: `is.workflow.actions.searchformaps`
**Description**: Action: Searchformaps
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Showonmap
**Identifier**: `is.workflow.actions.showonmap`
**Description**: Action: Showonmap
**Confidence**: low
**Parameters**: None
**Input Types**: any

## APPS ACTIONS (8)

### Open App
**Identifier**: `is.workflow.actions.openapp`
**Description**: Opens a specific app
**Confidence**: low
**Parameters**:
- `WFOpenAppActionAppIdentifier` (string) - **REQUIRED**
  - App bundle identifier
- `WFOpenAppActionApplication` (any)
  - Application to open

### Create Note
**Identifier**: `is.workflow.actions.createnote`
**Description**: Creates a note in the Notes app
**Confidence**: low
**Parameters**:
- `WFNoteActionNote` (string) - **REQUIRED**
  - Note content
- `WFNoteActionTitle` (string)
  - Note title
**Input Types**: WFStringContentItem

### Send Message
**Identifier**: `is.workflow.actions.sendmessage`
**Description**: Sends a message via Messages
**Confidence**: low
**Parameters**:
- `WFSendMessageActionRecipients` (array) - **REQUIRED**
  - Recipients
- `WFSendMessageActionMessage` (string) - **REQUIRED**
  - Message text
**Input Types**: WFStringContentItem
**Permissions**: contacts

### Make Phone Call
**Identifier**: `is.workflow.actions.makephonecall`
**Description**: Makes a phone call
**Confidence**: low
**Parameters**:
- `WFMakePhoneCallActionPhoneNumber` (string) - **REQUIRED**
  - Phone number
**Permissions**: contacts

### Showinapp
**Identifier**: `is.workflow.actions.showinapp`
**Description**: Action: Showinapp
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Openshare Sheet
**Identifier**: `is.workflow.actions.openshare_sheet`
**Description**: Action: Openshare Sheet
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Applepay
**Identifier**: `is.workflow.actions.applepay`
**Description**: Action: Applepay
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Openin
**Identifier**: `is.workflow.actions.openin`
**Description**: Action: Openin
**Confidence**: low
**Parameters**: None
**Input Types**: any

## CAMERA ACTIONS (11)

### Take Photo
**Identifier**: `is.workflow.actions.takephoto`
**Description**: Takes a photo with the camera
**Confidence**: low
**Parameters**: None
**Output Types**: WFImageContentItem
**Permissions**: camera

### Selectphotos
**Identifier**: `is.workflow.actions.selectphotos`
**Description**: Action: Selectphotos
**Confidence**: low
**Parameters**: None
**Input Types**: WFImageContentItem
**Permissions**: camera

### Savephotolibrary
**Identifier**: `is.workflow.actions.savephotolibrary`
**Description**: Action: Savephotolibrary
**Confidence**: low
**Parameters**: None
**Input Types**: WFImageContentItem
**Permissions**: camera

### Resizeimage
**Identifier**: `is.workflow.actions.resizeimage`
**Description**: Action: Resizeimage
**Confidence**: low
**Parameters**: None
**Input Types**: WFImageContentItem

### Cropimage
**Identifier**: `is.workflow.actions.cropimage`
**Description**: Action: Cropimage
**Confidence**: low
**Parameters**: None
**Input Types**: WFImageContentItem

### Rotateimage
**Identifier**: `is.workflow.actions.rotateimage`
**Description**: Action: Rotateimage
**Confidence**: low
**Parameters**: None
**Input Types**: WFImageContentItem

### Convertimage
**Identifier**: `is.workflow.actions.convertimage`
**Description**: Action: Convertimage
**Confidence**: low
**Parameters**: None
**Input Types**: WFImageContentItem

### Trimvideo
**Identifier**: `is.workflow.actions.trimvideo`
**Description**: Action: Trimvideo
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Combinevideos
**Identifier**: `is.workflow.actions.combinevideos`
**Description**: Action: Combinevideos
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Imagerecognition
**Identifier**: `is.workflow.actions.imagerecognition`
**Description**: Action: Imagerecognition
**Confidence**: low
**Parameters**: None
**Input Types**: WFImageContentItem

### Imagereasoning
**Identifier**: `is.workflow.actions.imagereasoning`
**Description**: Action: Imagereasoning
**Confidence**: low
**Parameters**: None
**Input Types**: WFImageContentItem

## DEVICE ACTIONS (2)

### Set Brightness
**Identifier**: `is.workflow.actions.setbrightness`
**Description**: Sets the screen brightness
**Confidence**: low
**Parameters**:
- `WFSetValue` (number) - **REQUIRED** - Validation: min: 0, max: 100
  - Brightness level (0-100)
- `WFSetBrightnessActionValue` (number) - **REQUIRED** - Default: `50`
  - Brightness level (0-100)
**Permissions**: device

### Set Do Not Disturb
**Identifier**: `is.workflow.actions.setdnd`
**Description**: Turns Do Not Disturb on or off
**Confidence**: high
**Parameters**:
- `WFSetDNDActionValue` (boolean) - **REQUIRED** - Default: `true`
  - Do Not Disturb state
- `WFSetDNDActionTime` (number) - Validation: min: 1, max: 1440
  - Duration in minutes (optional)
**Permissions**: device

## DATA ACTIONS (11)

### Calculate
**Identifier**: `is.workflow.actions.calculate`
**Description**: Performs mathematical calculations
**Confidence**: low
**Parameters**:
- `WFCalculateActionOperand1` (number) - **REQUIRED**
  - First operand
- `WFCalculateActionOperand2` (number) - **REQUIRED**
  - Second operand
- `WFCalculateActionOperation` (string) - **REQUIRED** - Default: `+`
  - Operation (+, -, *, /)
**Input Types**: number
**Output Types**: WFNumberContentItem

### Date
**Identifier**: `is.workflow.actions.date`
**Description**: Gets the current date or creates a date
**Confidence**: low
**Parameters**:
- `WFDateActionDate` (string) - Default: `now`
  - Date string
**Output Types**: WFDateContentItem

### Time
**Identifier**: `is.workflow.actions.time`
**Description**: Gets the current time or creates a time
**Confidence**: low
**Parameters**:
- `WFTimeActionTime` (string) - Default: `now`
  - Time string
**Output Types**: WFDateContentItem

### Count
**Identifier**: `is.workflow.actions.count`
**Description**: Action: Count
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Formatnumber
**Identifier**: `is.workflow.actions.formatnumber`
**Description**: Action: Formatnumber
**Confidence**: low
**Parameters**: None
**Input Types**: WFNumberContentItem

### Formatdate
**Identifier**: `is.workflow.actions.formatdate`
**Description**: Action: Formatdate
**Confidence**: low
**Parameters**: None
**Input Types**: WFDateContentItem

### Createcalendarevent
**Identifier**: `is.workflow.actions.createcalendarevent`
**Description**: Action: Createcalendarevent
**Confidence**: low
**Parameters**:
- `WFEventName` (string) - **REQUIRED** - Default: `New Event`
  - Event title
- `WFEventStartDate` (date) - **REQUIRED**
  - Event start date and time
- `WFEventEndDate` (date) - **REQUIRED**
  - Event end date and time
- `WFEventAllDay` (boolean) - Default: `false`
  - All-day event
- `WFEventCalendar` (any)
  - Calendar to add event to
- `WFEventAlertType` (string) - Default: `none` - Options: `none`, `at time of event`, `5 minutes before`, `15 minutes before`, `30 minutes before`, `1 hour before`, `2 hours before`, `1 day before`, `2 days before`, `1 week before`
  - Alert type
**Input Types**: any

### Deletecalendarevents
**Identifier**: `is.workflow.actions.deletecalendarevents`
**Description**: Action: Deletecalendarevents
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Findcalendars
**Identifier**: `is.workflow.actions.findcalendars`
**Description**: Action: Findcalendars
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Randomnumber
**Identifier**: `is.workflow.actions.randomnumber`
**Description**: Action: Randomnumber
**Confidence**: low
**Parameters**: None
**Input Types**: WFNumberContentItem

### Countlist
**Identifier**: `is.workflow.actions.countlist`
**Description**: Action: Countlist
**Confidence**: low
**Parameters**: None
**Input Types**: any

## GENERAL ACTIONS (35)

### Createfolder
**Identifier**: `is.workflow.actions.createfolder`
**Description**: Action: Createfolder
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Archive
**Identifier**: `is.workflow.actions.archive`
**Description**: Action: Archive
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Unarchive
**Identifier**: `is.workflow.actions.unarchive`
**Description**: Action: Unarchive
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Changecase
**Identifier**: `is.workflow.actions.changecase`
**Description**: Action: Changecase
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Detectlanguage
**Identifier**: `is.workflow.actions.detectlanguage`
**Description**: Action: Detectlanguage
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Output Types**: any

### Createreminder
**Identifier**: `is.workflow.actions.createreminder`
**Description**: Action: Createreminder
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Deletereminders
**Identifier**: `is.workflow.actions.deletereminders`
**Description**: Action: Deletereminders
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Findreminderlists
**Identifier**: `is.workflow.actions.findreminderlists`
**Description**: Action: Findreminderlists
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Encoding
**Identifier**: `is.workflow.actions.encoding`
**Description**: Action: Encoding
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Hash
**Identifier**: `is.workflow.actions.hash`
**Description**: Action: Hash
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Screenshot
**Identifier**: `is.workflow.actions.screenshot`
**Description**: Action: Screenshot
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Runshortcut
**Identifier**: `is.workflow.actions.runshortcut`
**Description**: Action: Runshortcut
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Dismissshortcut
**Identifier**: `is.workflow.actions.dismissshortcut`
**Description**: Action: Dismissshortcut
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Continueinshortcut
**Identifier**: `is.workflow.actions.continueinshortcut`
**Description**: Action: Continueinshortcut
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Waittoreturn
**Identifier**: `is.workflow.actions.waittoreturn`
**Description**: Action: Waittoreturn
**Confidence**: low
**Parameters**:
- `WFWaitActionWaitTime` (number) - **REQUIRED** - Default: `1` - Validation: min: 0, max: 3600
  - Time to wait in seconds
**Input Types**: any

### Average
**Identifier**: `is.workflow.actions.average`
**Description**: Action: Average
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Max
**Identifier**: `is.workflow.actions.max`
**Description**: Action: Max
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Min
**Identifier**: `is.workflow.actions.min`
**Description**: Action: Min
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Sum
**Identifier**: `is.workflow.actions.sum`
**Description**: Action: Sum
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Show
**Identifier**: `is.workflow.actions.show`
**Description**: Action: Show
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Dismiss
**Identifier**: `is.workflow.actions.dismiss`
**Description**: Action: Dismiss
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Lockscreen
**Identifier**: `is.workflow.actions.lockscreen`
**Description**: Action: Lockscreen
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Scanqrcode
**Identifier**: `is.workflow.actions.scanqrcode`
**Description**: Action: Scanqrcode
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Generateqrcode
**Identifier**: `is.workflow.actions.generateqrcode`
**Description**: Action: Generateqrcode
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Createbarcode
**Identifier**: `is.workflow.actions.createbarcode`
**Description**: Action: Createbarcode
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Speechrecognize
**Identifier**: `is.workflow.actions.speechrecognize`
**Description**: Action: Speechrecognize
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Permissions**: microphone

### Objectdetection
**Identifier**: `is.workflow.actions.objectdetection`
**Description**: Action: Objectdetection
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Output Types**: any

### Detectlandmarks
**Identifier**: `is.workflow.actions.detectlandmarks`
**Description**: Action: Detectlandmarks
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Output Types**: any

### Detectrectangles
**Identifier**: `is.workflow.actions.detectrectangles`
**Description**: Action: Detectrectangles
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Output Types**: any

### Detectfaces
**Identifier**: `is.workflow.actions.detectfaces`
**Description**: Action: Detectfaces
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Output Types**: any

### Coerce
**Identifier**: `is.workflow.actions.coerce`
**Description**: Action: Coerce
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Addtolist
**Identifier**: `is.workflow.actions.addtolist`
**Description**: Action: Addtolist
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Inserttolist
**Identifier**: `is.workflow.actions.inserttolist`
**Description**: Action: Inserttolist
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Removelistitem
**Identifier**: `is.workflow.actions.removelistitem`
**Description**: Action: Removelistitem
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Airdrop
**Identifier**: `is.workflow.actions.airdrop`
**Description**: Action: Airdrop
**Confidence**: low
**Parameters**: None
**Input Types**: any

## FILES ACTIONS (8)

### Savefile
**Identifier**: `is.workflow.actions.savefile`
**Description**: Action: Savefile
**Confidence**: low
**Parameters**: None
**Input Types**: WFGenericFileContentItem

### Deletefiles
**Identifier**: `is.workflow.actions.deletefiles`
**Description**: Action: Deletefiles
**Confidence**: low
**Parameters**: None
**Input Types**: WFGenericFileContentItem

### Movefile
**Identifier**: `is.workflow.actions.movefile`
**Description**: Action: Movefile
**Confidence**: low
**Parameters**: None
**Input Types**: WFGenericFileContentItem

### Appendtofile
**Identifier**: `is.workflow.actions.appendtofile`
**Description**: Action: Appendtofile
**Confidence**: low
**Parameters**: None
**Input Types**: WFGenericFileContentItem

### Addrowstospreadsheet
**Identifier**: `is.workflow.actions.addrowstospreadsheet`
**Description**: Action: Addrowstospreadsheet
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Createspreadsheet
**Identifier**: `is.workflow.actions.createspreadsheet`
**Description**: Action: Createspreadsheet
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Filterspreadsheet
**Identifier**: `is.workflow.actions.filterspreadsheet`
**Description**: Action: Filterspreadsheet
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Sortspreadsheet
**Identifier**: `is.workflow.actions.sortspreadsheet`
**Description**: Action: Sortspreadsheet
**Confidence**: low
**Parameters**: None
**Input Types**: any

## COMMUNICATION ACTIONS (4)

### Findcontacts
**Identifier**: `is.workflow.actions.findcontacts`
**Description**: Action: Findcontacts
**Confidence**: low
**Parameters**: None
**Input Types**: WFContactContentItem
**Permissions**: contacts

### Createcontact
**Identifier**: `is.workflow.actions.createcontact`
**Description**: Action: Createcontact
**Confidence**: low
**Parameters**: None
**Input Types**: WFContactContentItem
**Permissions**: contacts

### Deletecontact
**Identifier**: `is.workflow.actions.deletecontact`
**Description**: Action: Deletecontact
**Confidence**: low
**Parameters**: None
**Input Types**: WFContactContentItem
**Permissions**: contacts

### Send Email
**Identifier**: `is.workflow.actions.sendemail`
**Description**: Sends an email
**Confidence**: high
**Parameters**:
- `WFSendEmailActionRecipients` (array) - **REQUIRED**
  - Email recipients
- `WFSendEmailActionSubject` (string) - **REQUIRED**
  - Email subject
- `WFSendEmailActionBody` (string) - **REQUIRED**
  - Email body
- `WFSendEmailActionShowCompose` (boolean) - Default: `false`
  - Show compose window
**Input Types**: WFStringContentItem
**Permissions**: contacts

## HEALTH ACTIONS (5)

### Loghealthsample
**Identifier**: `is.workflow.actions.loghealthsample`
**Description**: Action: Loghealthsample
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Permissions**: health

### Starthealthworkout
**Identifier**: `is.workflow.actions.starthealthworkout`
**Description**: Action: Starthealthworkout
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Permissions**: health

### Stophealthworkout
**Identifier**: `is.workflow.actions.stophealthworkout`
**Description**: Action: Stophealthworkout
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Permissions**: health

### Pausehealthworkout
**Identifier**: `is.workflow.actions.pausehealthworkout`
**Description**: Action: Pausehealthworkout
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Permissions**: health

### Resumehealthworkout
**Identifier**: `is.workflow.actions.resumehealthworkout`
**Description**: Action: Resumehealthworkout
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Permissions**: health

## SMARTHOME ACTIONS (4)

### Controlhomeaccessory
**Identifier**: `is.workflow.actions.controlhomeaccessory`
**Description**: Action: Controlhomeaccessory
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Permissions**: home

### Findhomeaccessories
**Identifier**: `is.workflow.actions.findhomeaccessories`
**Description**: Action: Findhomeaccessories
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Permissions**: home

### Findhomes
**Identifier**: `is.workflow.actions.findhomes`
**Description**: Action: Findhomes
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Permissions**: home

### Controlhomeroom
**Identifier**: `is.workflow.actions.controlhomeroom`
**Description**: Action: Controlhomeroom
**Confidence**: low
**Parameters**: None
**Input Types**: any
**Permissions**: home

## COMMERCE ACTIONS (1)

### Makepayment
**Identifier**: `is.workflow.actions.makepayment`
**Description**: Action: Makepayment
**Confidence**: low
**Parameters**: None
**Input Types**: any

## SOCIAL ACTIONS (3)

### Posttotwitter
**Identifier**: `is.workflow.actions.posttotwitter`
**Description**: Action: Posttotwitter
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Posttofacebook
**Identifier**: `is.workflow.actions.posttofacebook`
**Description**: Action: Posttofacebook
**Confidence**: low
**Parameters**: None
**Input Types**: any

### Share
**Identifier**: `is.workflow.actions.share`
**Description**: Action: Share
**Confidence**: low
**Parameters**: None
**Input Types**: any

## Quick Reference Categories:
- **text**: 9 actions
- **notification**: 1 actions
- **web**: 5 actions
- **scripting**: 63 actions
- **media**: 8 actions
- **clipboard**: 3 actions
- **location**: 4 actions
- **apps**: 8 actions
- **camera**: 11 actions
- **device**: 2 actions
- **data**: 11 actions
- **general**: 35 actions
- **files**: 8 actions
- **communication**: 4 actions
- **health**: 5 actions
- **smarthome**: 4 actions
- **commerce**: 1 actions
- **social**: 3 actions

## Permission Categories:
- **none**: No special permissions required
- **notification**: Requires notification permission
- **camera**: Requires camera access
- **microphone**: Requires microphone access
- **location**: Requires location access
- **contacts**: Requires contacts access
- **photo-library**: Requires photo library access
- **device**: Requires device control permissions
- **media**: Requires media library access
- **health**: Requires health data access
- **home**: Requires HomeKit access
- **commerce**: Requires payment capabilities

## Common Action Patterns:
1. **Input → Process → Output**: Use actions that accept input and produce output
2. **User Interaction**: Use "ask", "choosefrommenu", "showalert" for user input
3. **Control Flow**: Use "if", "repeat", "wait" for logic and timing
4. **Data Handling**: Use "setvariable", "getvariable", "calculate" for data manipulation
5. **App Integration**: Use specific app actions for deep integration

## Error Prevention:
- Always validate required parameters are provided
- Check input/output type compatibility between actions
- Consider iOS version requirements for newer actions
- Test shortcuts with actual data to ensure reliability
- Handle potential permission denials gracefully

Generated: 2025-10-01T05:41:54.248Z
Total Actions: 185
