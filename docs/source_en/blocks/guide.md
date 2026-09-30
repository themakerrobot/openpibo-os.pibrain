# Block coding

PiBrain Maker uses Blockly for block coding. Besides the standard blocks there are PiBrain blocks that call
the **openpibo** Python package. The [Python code] button shows the Python code your blocks make.

```{note}
This page is generated from the IDE toolbox (`docs/tools/gen_block_guide.py`). Each picture shows the block as it comes out of the toolbox.
Everything runs **inside PiBrain**. Only the [Collect] category needs the internet, and it is only in the Korean edition.
```

## Categories

```
Standard Blockly blocks (hover over a block to see what it does)
├── Logic (7)
├── Loops (5)
├── Math (13)
├── Text (15)
├── Lists (12)
├── Colour (4)
├── Variables (appear when you make one)
└── Functions (appear when you make one)

PiBrain blocks
├── Start (1)
├── Audio (3)
├── Collect (4)
├── Device (7)
├── Oled (11)
├── Speech (7)
├── Vision (16)
├── Rec (36)
└── Utils (12)
```

## PiBrain blocks

### Start

<img src="img/flag_event.png" alt="When [ Run] clicked" width="251" class="blk">

Run the code.

### Audio

<img src="img/audio_play_dynamic.png" alt="Play [Select folder ▾] [Select file ▾] audio with ([80]) volume" width="642" class="blk">

Select and play audio at set volume.

<img src="img/audio_play.png" alt="Play [Select folder ▾] ([audio]) . [mp3 ▾] audio with ([80]) volume" width="746" class="blk">

Enter music file name to play.

<img src="img/audio_stop.png" alt="Stop audio" width="161" class="blk">

Stop the audio currently playing.

### Collect

```{note}
Korean edition only (Korean weather regions and a Korean news feed). The Global edition does not have this category.
```

<img src="img/wikipedia_search.png" alt="Search Wikipedia for ([Robot])" width="423" class="blk">

(Internet!) Search Wikipedia with the given keyword. *returns a value*

<img src="img/weather_forecast.png" alt="[Seoul ▾] Search for comprehensive weather information" width="633" class="blk">

(Internet!) Search for comprehensive weather information in a specific area. *returns a value*

<img src="img/weather_search.png" alt="[Seoul ▾] Search for [today ▾] weather information [forecast ▾]" width="705" class="blk">

(Internet!) Search for weather information in a specific area. *returns a value*

<img src="img/news_search.png" alt="[newsflash ▾] Search for [topic ▾] news" width="479" class="blk">

(Internet!) Retrieve search results with news keywords. *returns a value*

### Device

<img src="img/device_pibrain_button.png" alt="Check button [SW1 ▾]" width="282" class="blk">

Check button status. *returns a value*

<img src="img/device_pibrain_led_on.png" alt="Turn on LEDs ([0]) ([0]) ([0])" width="332" class="blk">

Turn on LED

<img src="img/device_pibrain_led_colour_on.png" alt="Turn on LEDs with color variable ([item ▾])" width="458" class="blk">

Turn on LED with a color variable.

<img src="img/device_pibrain_led_off.png" alt="Turn off LEDs" width="187" class="blk">

Turn off LED

<img src="img/device_pibrain_uart_init.png" alt="Connect [USB0 ▾]" width="238" class="blk">

Connect USB Device.

<img src="img/device_pibrain_uart_send.png" alt="Send (값) to USB Device" width="346" class="blk">

Send message to USB Device.

<img src="img/device_pibrain_uart_close.png" alt="Disconnect USB Device" width="283" class="blk">

Disconnect USB Device.

### Oled

<img src="img/oled_set_font.png" alt="Set OLED font size to ([30])" width="319" class="blk">

Set the font size on the OLED display.

<img src="img/oled_draw_text.png" alt="Save ([Hello]) to OLED at ([0]) ([0])" width="450" class="blk">

Display text on the OLED screen.

<img src="img/oled_draw_image_dynamic.png" alt="Save OLED [Select folder ▾] [Select file ▾] image" width="532" class="blk">

Display dynamically selected image on OLED.

<img src="img/oled_draw_image.png" alt="Save OLED [Select folder ▾] ([sample]) . [jpg ▾] image" width="638" class="blk">

Display a specified image on OLED.

<img src="img/oled_draw_data.png" alt="Save OLED ([item ▾]) image data" width="372" class="blk">

Display a specified image data on OLED.

<img src="img/oled_draw_rectangle.png" alt="Save [Fill ▾] rectangle to OLED at ([0]) ([0]) , ([0]) ([0])" width="590" class="blk">

Draw a rectangle on OLED.

<img src="img/oled_draw_ellipse.png" alt="Save [Fill ▾] ellipse to OLED at ([0]) ([0]) , ([0]) ([0])" width="561" class="blk">

Draw an ellipse on OLED.

<img src="img/oled_draw_line.png" alt="Save line to OLED at ([0]) ([0]) , ([0]) ([0])" width="461" class="blk">

Draw a line on OLED.

<img src="img/oled_invert.png" alt="Invert OLED" width="173" class="blk">

Invert colors on the OLED screen.

<img src="img/oled_show.png" alt="Show OLED" width="171" class="blk">

Display content on OLED screen.

<img src="img/oled_clear.png" alt="Clear OLED" width="168" class="blk">

Clear the OLED screen.

### Speech

<img src="img/speech_otts.png" alt="Save ([Hello]) with [Male 1 ▾] voice to [Select folder ▾] ([tts]) . [mp3 ▾]" width="857" class="blk">

Make speech on the robot and save it to a file. Korean and English are detected automatically.

<img src="img/speech_otts_play.png" alt="Say ([Hello]) with [Male 1 ▾] voice at ([80]) volume" width="601" class="blk">

Make speech on the robot and say it. Korean and English are detected automatically.

<img src="img/speech_etts.png" alt="Save ([Hello]) with Espeak voice to [Select folder ▾] ([tts]) . [mp3 ▾]" width="824" class="blk">

Save text as espeak robot voice to a file.

<img src="img/speech_etts_play.png" alt="Say ([Hello]) with Espeak voice at ([80]) volume" width="568" class="blk">

Say text with the espeak robot voice.

<img src="img/speech_start_llm.png" alt="Start LLM server" width="218" class="blk">

Start LLM server.

<img src="img/speech_call_llm.png" alt="Respond to ([Hello]) , System prompt (값)" width="562" class="blk">

Send text to the LLM server and get a reply. The system prompt sets how piBo should answer. *returns a value*

<img src="img/speech_stop_llm.png" alt="Stop LLM server" width="215" class="blk">

Stop the LLM server.

### Vision

<img src="img/vision_read.png" alt="Take a picture" width="201" class="blk">

Capture an image. *returns a value*

<img src="img/vision_imread_dynamic.png" alt="Load image file [Select folder ▾] [Select file ▾]" width="513" class="blk">

Load a specified image file. *returns a value*

<img src="img/vision_imread.png" alt="Load image file [Select folder ▾] ([image]) . [jpg ▾]" width="609" class="blk">

Load an image file. *returns a value*

<img src="img/vision_create_matte.png" alt="Create ([item ▾]) Color matte" width="344" class="blk">

Create a blank image filled with the chosen color. *returns a value*

<img src="img/vision_imwrite.png" alt="Save image ([item ▾]) to [Select folder ▾] ([image]) . [jpg ▾]" width="687" class="blk">

Save as an image file.

<img src="img/vision_imshow_to_ide.png" alt="Display image variable ([item ▾]) on IDE" width="434" class="blk">

Display an image variable in IDE.

<img src="img/vision_imshow_to_oled.png" alt="Display image variable ([item ▾]) on OLED" width="456" class="blk">

Display an image variable in OLED.

<img src="img/vision_rectangle.png" alt="Display a rectangle with color ([item ▾]) and thickness ([2]) at coordinates ([0]) ([0]) ([0]) ([0]) of image ([item ▾]) ." width="1160" class="blk">

Draws a rectangle on the image.

<img src="img/vision_circle.png" alt="Display a circle with radius ([0]) , color ([item ▾]) , thickness ([2]) at coordinates ([0]) ([0]) of image ([item ▾]) ." width="1119" class="blk">

Displays a circle in the image.

<img src="img/vision_line.png" alt="Display a line with color ([item ▾]) and thickness ([2]) at coordinates from ([0]) ([0]) to ([0]) ([0]) of image ([item ▾]) ." width="1180" class="blk">

Displays a line in the image.

<img src="img/vision_text.png" alt="Display ([Hello]) with size ([30]) and color ([item ▾]) at coordinates ([0]) and ([0]) of image ([item ▾]) ." width="1088" class="blk">

Display text on the image.

<img src="img/vision_transfer.png" alt="Convert image ([item ▾]) to [cartoon ▾]" width="445" class="blk">

Transform image style. *returns a value*

<img src="img/vision_resize.png" alt="image ([item ▾]) resize to width ([100]) height ([100])" width="560" class="blk">

Resize the image. *returns a value*

<img src="img/make_bitmap_6x8.png" alt="6×8 dot picture" width="153" class="blk">

Turns the 6×8 picture you draw by tapping dots into an image (scaled to the camera size). *returns a value*

<img src="img/make_bitmap_8x4.png" alt="8×4 dot picture" width="174" class="blk">

Turns the 8×4 picture you draw by tapping dots into an image (scaled to the camera size). *returns a value*

<img src="img/make_bitmap_8x8.png" alt="8×8 dot picture" width="173" class="blk">

Turns the 8×8 picture you draw by tapping dots into an image (scaled to the camera size). *returns a value*

### Rec

<img src="img/vision_face_detect.png" alt="Find faces in image ([item ▾])" width="336" class="blk">

Detect and identify faces in the specified image. *returns a value*

<img src="img/vision_face_detect_vis.png" alt="Show face ([item ▾]) in the image ([item ▾])" width="470" class="blk">

Show faces in the image.

<img src="img/vision_face_analyze.png" alt="Analyze face ([item ▾]) of image ([item ▾]) (age, gender, emotion)" width="690" class="blk">

Analyze face in image(age, gender, emotion) *returns a value*

<img src="img/vision_face_analyze_vis.png" alt="Show face analysis ([item ▾]) in the image ([item ▾])" width="552" class="blk">

Show face analysis in the image

<img src="img/vision_face_landmark.png" alt="Find face ([item ▾]) landmark in the image ([item ▾])" width="551" class="blk">

Find face landmark in the image *returns a value*

<img src="img/vision_face_landmark_vis.png" alt="Show face landmark ([item ▾]) in the image ([item ▾])" width="564" class="blk">

Show face landmark in the image.

<img src="img/vision_facedb.png" alt="Face dictionary" width="214" class="blk">

Get the list of names in the face dictionary. *returns a value*

<img src="img/vision_facedb_train.png" alt="Train image ([item ▾]) face ([item ▾]) to name ([pibo])" width="621" class="blk">

Train face from image.

<img src="img/vision_facedb_delete.png" alt="Delete face name ([pibo]) from face training data" width="579" class="blk">

Delete a specific face from training faces.

<img src="img/vision_facedb_recognize.png" alt="Recognize who is image ([item ▾]) face ([item ▾])" width="524" class="blk">

Recognize who faces are in an image. *returns a value*

<img src="img/vision_facedb_save.png" alt="Save face training data to file [Select folder ▾] ([facedb])" width="654" class="blk">

Save face training data to file.

<img src="img/vision_facedb_load.png" alt="Load face training data from file [Select folder ▾] ([facedb])" width="680" class="blk">

Load face training data from file.

<img src="img/vision_face_mesh.png" alt="Analyze face direction/distance in the image ([item ▾])" width="573" class="blk">

Analyze face direction/distance in the image. *returns a value*

<img src="img/vision_face_mesh_vis.png" alt="Show face direction/distance ([item ▾]) in the image ([item ▾])" width="647" class="blk">

Show face direction/distance in the image

<img src="img/vision_object_load_ext.png" alt="Load Object detection model [Select folder ▾] ([yolo11s]) .onnx" width="717" class="blk">

Load Object detection model

<img src="img/vision_object.png" alt="Find objects in the image ([item ▾])" width="391" class="blk">

Find objects in the image. *returns a value*

<img src="img/vision_object_raw.png" alt="Find objects in the image ([item ▾]) (Raw)" width="462" class="blk">

Find objects in the image. (RAW) *returns a value*

<img src="img/vision_object_vis.png" alt="Show objects ([item ▾]) in the image ([item ▾])" width="499" class="blk">

Show objects in the image.

<img src="img/vision_qr.png" alt="Find QR in the image ([item ▾])" width="349" class="blk">

Find QR in the image. *returns a value*

<img src="img/vision_qr_raw.png" alt="Find QR in the image ([item ▾]) (RAW)" width="425" class="blk">

Find QR in the image. (RAW) *returns a value*

<img src="img/vision_qr_vis.png" alt="Show QR ([item ▾]) in the image ([item ▾])" width="457" class="blk">

Show QR codes in the image.

<img src="img/vision_pose.png" alt="Detect poses in image ([item ▾])" width="364" class="blk">

Identify and analyze human poses in the specified image. *returns a value*

<img src="img/vision_pose_vis.png" alt="Show pose data ([item ▾]) in the image ([item ▾])" width="524" class="blk">

Show pose data in the image.

<img src="img/vision_analyze_pose.png" alt="Analyze pose results in ([item ▾]) and save to [motion ▾]" width="606" class="blk">

Evaluate and interpret pose data from the image and save the results. *returns a value*

<img src="img/vision_object_tracker_init.png" alt="Setting tracker at coordinates ([0]) ([0]) , ([0]) ([0]) of image ([item ▾])" width="735" class="blk">

Set a tracker for a specific location in the image.

<img src="img/vision_object_track.png" alt="Track thing in the image ([item ▾])" width="381" class="blk">

Track thing in the image. *returns a value*

<img src="img/vision_object_track_vis.png" alt="Show tracking result ([item ▾]) in the image ([item ▾])" width="565" class="blk">

Show tracking result in the image.

<img src="img/vision_hand_gesture_load.png" alt="Load Hand gesture model [gesture_recognizer ▾]" width="533" class="blk">

Load Hand gesture model.

<img src="img/vision_hand_gesture_load_ext.png" alt="Load Hand gesture model [Select folder ▾] ([gesture_recognizer]) .task" width="795" class="blk">

Load Hand gesture model

<img src="img/vision_hand_gesture.png" alt="Recognize Hand gesture in the image ([item ▾])" width="508" class="blk">

Recognize Hand gesture in the image. *returns a value*

<img src="img/vision_hand_gesture_vis.png" alt="Show hand gesture ([item ▾]) in the image ([item ▾])" width="555" class="blk">

Show hand gesture in the image.

<img src="img/vision_marker_detect.png" alt="Detect Marker length ([5]) in image ([item ▾])" width="491" class="blk">

Detect Marker in the specified image. *returns a value*

<img src="img/vision_marker_detect_vis.png" alt="Show marker ([item ▾]) in the image ([item ▾])" width="495" class="blk">

Show marker in the image.

<img src="img/vision_load_cf.png" alt="Load classifier model [Select folder ▾] ([model name])" width="630" class="blk">

Load a model you taught and saved in the Classifier. Folder mymodel, then the model name. (image, hand, face, pose)

<img src="img/vision_predict_cf.png" alt="Classify ([item ▾]) with classifier model" width="438" class="blk">

Classify the image with the loaded classifier model and return the best matching name. Hand, face and pose models return empty text when no hand, face or body is in view. *returns a value*

<img src="img/vision_predict_cf_vis.png" alt="Draw what the classifier saw on image ([item ▾])" width="518" class="blk">

Draws what the last [Classify with classifier model] saw on that image: points and bones for hand and pose, points for face, plus the class name and probability.

### Utils

<img src="img/utils_sleep.png" alt="Delay for ([1]) seconds" width="282" class="blk">

Pause the process for a specified duration of seconds.

<img src="img/utils_time.png" alt="Get time value" width="204" class="blk">

Retrieve the current time value. *returns a value*

<img src="img/utils_current_time.png" alt="Get current time" width="222" class="blk">

Obtain the current time. *returns a value*

<img src="img/utils_include.png" alt="Check if ( ) is included in ( )" width="381" class="blk">

Verify if an element is included in a list or array. *returns a value*

<img src="img/utils_dict_get.png" alt="Get value of key ([Key name]) from dictionary ([item ▾])" width="639" class="blk">

Retrieve the value associated with a specific key in a dictionary. *returns a value*

<img src="img/utils_dict_set.png" alt="Append { ([Key name]) : ( ) } to dictionary ([item ▾])" width="631" class="blk">

Add a new key-value pair to an existing dictionary.

<img src="img/utils_dict_create.png" alt="Create empty dictionary" width="297" class="blk">

Generate a new empty dictionary. *returns a value*

<img src="img/utils_array_slice_set.png" alt="set array ([item ▾]) [ ([0]) : ([0]) , ([0]) : ([0]) ] to ([item ▾])" width="621" class="blk">

Set the values of the specified range in the array.

<img src="img/utils_check_path.png" alt="Check if [File ▾] ([Path]) exists" width="417" class="blk">

Confirm the existence of a file or directory. *returns a value*

<img src="img/utils_typecast_string.png" alt="Convert ([1]) to String type" width="330" class="blk">

Change a variable's type to String. *returns a value*

<img src="img/utils_typecast_number.png" alt="Convert ([1]) to [Integer ▾] type" width="430" class="blk">

Convert a variable to a specific numeric type. (Integer or Float) *returns a value*

<img src="img/utils_calculate_angle.png" alt="Get angle of ([item ▾]) - ([item ▾]) - ([item ▾])" width="490" class="blk">

Get angle *returns a value*
