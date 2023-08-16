const toolbox_en = {
  "kind": "categoryToolbox",
  "contents": [
    { // Logic
      "kind": "category",
      "name": translations['logic']['en'],
      "cssConfig": {
        "icon": "customIcon fa fa-bars-staggered"
      },
      "contents": [
        {
          "kind": "block",
          "type": "controls_if"
        },
        {
          "kind": "block",
          "type": "logic_compare"
        },
        {
          "kind": "block",
          "type": "logic_operation"
        },
        {
          "kind": "block",
          "type": "logic_negate"
        },
        {
          "kind": "block",
          "type": "logic_boolean"
        },
        {
          "kind": "block",
          "type": "logic_null"
        },
        {
          "kind": "block",
          "type": "logic_ternary"
        }
      ],
      "categorystyle": "logic_category"
    },
    { // Loops
      "kind": "category",
      "name": translations['loops']['en'],
      "cssConfig": {
        "icon": "customIcon fa fa-arrows-spin"
      },
      "contents": [
        {
          "kind": "block",
          "type": "controls_repeat_ext",
          "inputs": {
            "TIMES": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "10"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "controls_whileUntil"
        },
        {
          "kind": "block",
          "type": "controls_for",
          "inputs": {
            "FROM": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "1"
                }
              }
            },
            "TO": {
              "shadow": {
                "type": "math_number",
                "fields": {
                "NUM": "10"
                }
              }
            },
            "BY": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "1"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "controls_forEach"
        },
        {
          "kind": "block",
          "type": "controls_flow_statements"
        }
      ],
      "categorystyle": "loop_category"
    },
    { // Math
      "kind": "category",
      "name": translations['math']['en'],
      "cssConfig": {
        "icon": "customIcon fa fa-square-root-variable"
      },
      "contents": [
        {
          "kind": "block",
          "type": "math_number",
          "fields": {
            "NUM": "123"
          }
        },
        {
          "kind": "block",
          "type": "math_arithmetic",
          "inputs": {
            "A": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "1"
                }
              }
            },
            "B": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "1"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "math_single",
          "inputs": {
            "NUM": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "9"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "math_trig",
          "inputs": {
            "NUM": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "45"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "math_constant"
        },
        {
          "kind": "block",
          "type": "math_number_property",
          "inputs": {
            "NUMBER_TO_CHECK": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "math_round",
          "inputs": {
            "NUM": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "3.1"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "math_on_list"
        },
        {
          "kind": "block",
          "type": "math_modulo",
          "inputs": {
            "DIVIDEND": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "64"
                }
              }
            },
            "DIVISOR": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "10"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "math_constrain",
          "inputs": {
            "VALUE": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "50"
                }
              }
            },
            "LOW": {
              "shadow": {
              "type": "math_number",
                "fields": {
                  "NUM": "1"
                }
              }
            },
            "HIGH": {
              "shadow": {
              "type": "math_number",
                "fields": {
                "NUM": "100"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "math_random_int",
          "inputs": {
            "FROM": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "1"
                }
              }
            },
            "TO": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "100"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "math_random_float"
        },
        {
          "kind": "block",
          "type": "math_atan2",
          "inputs": {
            "X": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "1"
                }
              }
            },
            "Y": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "1"
                }
              }
            }
          }
        }      
      ],
      "categorystyle": "math_category"
    },
    { // Text
      "kind": "category",
      "name": translations['text']['en'],
      "cssConfig": {
        "icon": "customIcon fa fa-t"
      },
      "contents": [
        {
          "kind": "block",
          "type": "text"
        },
        {
          "kind": "block",
          "type": "text_join"
        },
        {
          "kind": "block",
          "type": "text_append",
          "inputs": {
            "TEXT": {
              "shadow": {
                "type": "text"
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "text_length",
          "inputs": {
            "VALUE": {
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "abc"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "text_isEmpty",
          "inputs": {
            "VALUE": {
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": null
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "text_indexOf",
          "inputs": {
            "VALUE": {
              "block": {
                "type": "variables_get",
                "fields": {
                  "VAR": "{textVariable}"
                }
              }
            },
            "FIND": {
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "abc"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "text_charAt",
          "inputs": {
            "VALUE": {
              "block": {
                "type": "variables_get",
                "fields": {
                  "VAR": "{textVariable}"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "text_getSubstring",
          "inputs": {
            "STRING": {
              "block": {
                "type": "variables_get",
                "fields": {
                  "VAR": "{textVariable}"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "text_changeCase",
          "inputs": {
            "TEXT": {
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "abc"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "text_trim",
          "inputs": {
            "TEXT": {
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "abc"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "text_count",
          "inputs": {
            "SUB": {
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "a"
                }
              }
            },
            "TEXT": {
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "abc"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "text_replace",
          "inputs": {
            "FROM": {
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "m"
                }
              }
            },
            "TO": {
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "w"
                }
              }
            },
            "TEXT": {
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "abc"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "text_reverse",
          "inputs": {
            "TEXT": {
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "abc"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "text_print",
          "inputs": {
            "TEXT": {
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "abc"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "text_prompt_ext",
          "inputs": {
            "TEXT": {
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "abc"
                }
              }
            }
          }
        },
      ],
      "categorystyle": "text_category"
    },
    { // Lists
      "kind": "category",
      "name": translations['lists']['en'],
      "cssConfig": {
        "icon": "customIcon fa fa-list"
      },
      "contents": [
        {
          "kind": "block",
          "type": "lists_create_with",
          "extraState": {
            "itemCount": "0"
          }
        },
        {
          "kind": "block",
          "type": "lists_create_with"
        },
        {
          "kind": "block",
          "type": "lists_repeat",
          "inputs": {
            "NUM": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "5"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "lists_length"
        },
        {
          "kind": "block",
          "type": "lists_isEmpty"
        },
        {
          "kind": "block",
          "type": "lists_indexOf",
          "inputs": {
            "VALUE": {
              "block": {
                "type": "variables_get",
                "fields": {
                  "VAR": "{listVariable}"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "lists_getIndex",
          "inputs": {
            "VALUE": {
              "block": {
                "type": "variables_get",
                "fields": {
                  "VAR": "{listVariable}"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "lists_setIndex",
          "inputs": {
            "LIST": {
              "block": {
                "type": "variables_get",
                "fields": {
                  "VAR": "{listVariable}"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "lists_getSublist",
          "inputs": {
            "LIST": {
              "block": {
                "type": "variables_get",
                "fields": {
                  "VAR": "{listVariable}"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "lists_split",
          "inputs": {
            "DELIM": {
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": ","
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "lists_sort"
        },
        {
          "kind": "block",
          "type": "lists_reverse"
        },
      ],
      "categorystyle": "list_category"
    },
    { // Colour
      "kind": "category",
      "name": translations['colour']['en'],
      "cssConfig": {
        "icon": "customIcon fa fa-palette"
      },
      "contents": [
        {
          "kind": "block",
          "type": "colour_picker"
        },
        {
          "kind": "block",
          "type": "colour_random"
        },
        {
          "kind": "block",
          "type": "colour_rgb",
          "inputs": {
            "RED": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "100"
                }
              }
            },
            "GREEN": {
              "shadow": {
                "type": "math_number",
                  "fields": {
                "NUM": "50"
                }
              }
            },
            "BLUE": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "colour_blend",
          "inputs": {
            "COLOUR1": {
              "shadow": {
                "type": "colour_picker",
                "fields": {
                  "COLOUR": "#ff0000"
                }
              }
            },
            "COLOUR2": {
              "shadow": {
                "type": "colour_picker",
                "fields": {
                  "COLOUR": "#3333ff"
                }
              }
            },
            "RATIO": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0.5"
                }
              }
            }
          }
        }
      ],
      "categorystyle": "colour_category"
    },
    {
      "kind": "sep"
    },
    { // Variables
      "kind": "category",
      "name": translations['variables']['en'],
      "contents": [],
      "custom": "VARIABLE",
      "categorystyle": "variable_category",
      "cssConfig": {
        "icon": "customIcon fa fa-v"
      }
    },
    { // Functions
      "kind": "category",
      "name": translations['functions']['en'],
      "contents": [],
      "custom": "PROCEDURE",
      "categorystyle": "procedure_category",
      "cssConfig": {
        "icon": "customIcon fa fa-florin-sign"
      }
    },
    {
      "kind": "sep",
    },
    { // Audio
      "kind": "category",
      "name": translations['audio']['en'],
      "contents": [
        {
          "kind": "block",
          "type": "audio_play",
          "inputs":{
            "filename":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "audio filename"
                }
              }
            },
            "volume": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "80"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "audio_stop",
        },
        {
          "kind": "block",
          "type": "audio_record",
          "inputs":{
            "filename":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "audio filename"
                }
              }
            },
            "timeout": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "5"
                }
              }
            }
          }
        }
      ],
      "colour": color_type["audio"],
      "cssConfig": {
        "icon": "customIcon fa-solid fa-music"
      }
    },
    { // Collect
      "kind": "category",
      "name": translations['collect']['en'],
      "contents": [
        {
          "kind": "block",
          "type": "wikipedia_search",
          "inputs":{
            "topic":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "robot"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "weather_search",
        },
        {
          "kind": "block",
          "type": "news_search",
        },
      ],
      "colour": color_type["collect"],
      "cssConfig": {
        "icon": "customIcon fa-solid fa-magnifying-glass-chart"
      }
    },
    { // Device
      "kind": "category",
      "name": translations['device']['en'],
      "contents": [
        {
          "kind": "block",
          "type": "device_eye_on",
          "inputs":{
            "val0": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "val1": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "val2": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "val3": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "val4": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "val5": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "device_eye_colour_on",
          "inputs":{
            "left":{
              "shadow": {
                "type": "variables_get",
              }
            },
            "right":{
              "shadow": {
                "type": "variables_get",
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "device_eye_off",
        },
        {
          "kind": "block",
          "type": "device_get_dc",
        },
        {
          "kind": "block",
          "type": "device_get_battery",
        },
        {
          "kind": "block",
          "type": "device_get_system",
        },
        {
          "kind": "block",
          "type": "device_get_pir",
        },
        {
          "kind": "block",
          "type": "device_get_touch",
        },
        {
          "kind": "block",
          "type": "device_get_button",
        },
      ],
      "colour": color_type["device"],
      "cssConfig": {
        "icon": "customIcon fa-solid fa-walkie-talkie"
      }
    },
    { // Motion
      "kind": "category",
      "name": translations['motion']['en'],
      "contents": [
        {
          "kind": "block",
          "type": "motion_get_motion",
        },
        {
          "kind": "block",
          "type": "motion_get_mymotion",
        },
        {
          "kind": "block",
          "type": "motion_set_motion",
          "inputs":{
            "name":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "wave1"
                }
              }
            },
            "cycle": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "1"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "motion_set_mymotion",
          "inputs":{
            "name":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": translations['mymotion']['en']
                }
              }
            },
            "cycle": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "1"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "motion_init_motion",
        },
        {
          "kind": "block",
          "type": "motion_set_motor",
          "inputs":{
            "pos": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "motion_set_speed",
          "inputs":{
            "val": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "40"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "motion_set_acceleration",
          "inputs":{
            "val": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            }
          }
        },
      ],
      "colour": color_type["motion"],
      "cssConfig": {
        "icon": "customIcon fa-solid fa-person-walking"
      }
    },
    { // Oled
      "kind": "category",
      "name": translations['oled']['en'],
      "contents": [
        {
          "kind": "block",
          "type": "oled_set_font",
          "inputs":{
            "size": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "10"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "oled_draw_text",
          "inputs":{
            "x": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "y": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "text":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "Hello."
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "oled_draw_image",
          "inputs":{
            "filename":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": translations['image_filename']['en']
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "oled_draw_rectangle",
          "inputs":{
            "x1": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "y1": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "x2": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "y2": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
          }
        },
        {
          "kind": "block",
          "type": "oled_draw_ellipse",
          "inputs":{
            "x1": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "y1": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "x2": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "y2": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
          }
        },
        {
          "kind": "block",
          "type": "oled_draw_line",
          "inputs":{
            "x1": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "y1": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "x2": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "y2": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
          }
        },
        {
          "kind": "block",
          "type": "oled_invert",
        },
        {
          "kind": "block",
          "type": "oled_show",
        },
        {
          "kind": "block",
          "type": "oled_clear",
        },
      ],
      "colour": color_type["oled"],
      "cssConfig": {
        "icon": "customIcon fa-solid fa-display"
      }
    },
    { // Speech
      "kind": "category",
      "name": translations['speech']['en'],
      "contents": [
        {
          "kind": "block",
          "type": "speech_stt",
          "inputs":{
            "timeout": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "5"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "speech_tts",
          "inputs":{
            "text":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "Hello."
                }
              }
            },
            "filename":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "audio filename"
                }
              }
            },
          }
        },
        {
          "kind": "block",
          "type": "speech_get_dialog",
          "inputs":{
            "text":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "Hello."
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "speech_load_dialog",
          "inputs":{
            "filename":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "csv filename"
                }
              }
            }
          }
        }
      ],
      "colour": color_type["speech"],
      "cssConfig": {
        "icon": "customIcon fa-solid fa-comment-dots"
      }
    },
    { // Vision
      "kind": "category",
      "name": translations['vision']['en'],
      "contents": [
        {
          "kind": "block",
          "type": "vision_read",
        },
        {
          "kind": "block",
          "type": "vision_imread",
          "inputs":{
            "filename":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": translations['image_filename']['en']
                }
              }
            },
          }
        },
        {
          "kind": "block",
          "type": "vision_imwrite",
          "inputs":{
            "filename":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": translations['image_filename']['en']
                }
              }
            },
            "img":{
              "shadow":{
                "type":"variables_get",
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "vision_imshow_to_ide",
          "inputs":{
            "filename":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": translations['image_filename']['en']
                }
              }
            },
          }
        },
        {
          "kind": "block",
          "type": "vision_transfer",
          "inputs":{
            "img":{
              "shadow": {
                "type": "variables_get",
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "vision_object",
          "inputs":{
            "img":{
              "shadow": {
                "type": "variables_get",
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "vision_qr",
          "inputs":{
            "img":{
              "shadow": {
                "type": "variables_get",
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "vision_pose",
          "inputs":{
            "img":{
              "shadow": {
                "type": "variables_get",
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "vision_analyze_pose",
          "inputs":{
            "val":{
              "shadow": {
                "type": "variables_get",
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "vision_classification",
          "inputs":{
            "img":{
              "shadow": {
                "type": "variables_get",
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "vision_load_tm",
          "inputs":{
            "modelpath":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "model filename"
                }
              }
            },
            "labelpath":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "label filename"
                }
              }
            },
          }
        },
        {
          "kind": "block",
          "type": "vision_predict_tm",
          "inputs":{
            "img":{
              "shadow": {
                "type": "variables_get",
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "vision_call_ai",
          "inputs":{
            "filename":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": translations['image_filename']['en']
                }
              }
            },
          }
        },
      ],
      "colour": color_type["vision"],
      "cssConfig": {
        "icon": "customIcon fa-solid fa-camera-retro"
      }
    },
    { // Utils
      "kind": "category",
      "name": translations['utils']['en'],
      "contents": [
        {
          "kind": "block",
          "type": "utils_sleep",
          "inputs":{
            "time": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "1"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "utils_time",
        },
        {
          "kind": "block",
          "type": "utils_current_time",
        },
        {
          "kind": "block",
          "type": "utils_include",
        },
        {
          "kind": "block",
          "type": "utils_dict",
          "inputs":{
            "dictionary":{
              "shadow":{
                "type":"variables_get",
              }
            },
            "keyname":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "key name"
                }
              }
            },
          }
        },
      ],
      "colour": color_type["utils"],
      "cssConfig": {
        "icon": "customIcon fa-solid fa-toolbox"
      }
    },
  ]
}

const toolbox_ko = {
  "kind": "categoryToolbox",
  "contents": [
    { // Logic
      "kind": "category",
      "name": translations['logic']['ko'],
      "cssConfig": {
        "icon": "customIcon fa fa-bars-staggered"
      },
      "contents": [
        {
          "kind": "block",
          "type": "controls_if"
        },
        {
          "kind": "block",
          "type": "logic_compare"
        },
        {
          "kind": "block",
          "type": "logic_operation"
        },
        {
          "kind": "block",
          "type": "logic_negate"
        },
        {
          "kind": "block",
          "type": "logic_boolean"
        },
        {
          "kind": "block",
          "type": "logic_null"
        },
        {
          "kind": "block",
          "type": "logic_ternary"
        }
      ],
      "categorystyle": "logic_category"
    },
    { // Loops
      "kind": "category",
      "name": translations['loops']['ko'],
      "cssConfig": {
        "icon": "customIcon fa fa-arrows-spin"
      },
      "contents": [
        {
          "kind": "block",
          "type": "controls_repeat_ext",
          "inputs": {
            "TIMES": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "10"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "controls_whileUntil"
        },
        {
          "kind": "block",
          "type": "controls_for",
          "inputs": {
            "FROM": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "1"
                }
              }
            },
            "TO": {
              "shadow": {
                "type": "math_number",
                "fields": {
                "NUM": "10"
                }
              }
            },
            "BY": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "1"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "controls_forEach"
        },
        {
          "kind": "block",
          "type": "controls_flow_statements"
        }
      ],
      "categorystyle": "loop_category"
    },
    { // Math
      "kind": "category",
      "name": translations['math']['ko'],
      "cssConfig": {
        "icon": "customIcon fa fa-square-root-variable"
      },
      "contents": [
        {
          "kind": "block",
          "type": "math_number",
          "fields": {
            "NUM": "123"
          }
        },
        {
          "kind": "block",
          "type": "math_arithmetic",
          "inputs": {
            "A": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "1"
                }
              }
            },
            "B": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "1"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "math_single",
          "inputs": {
            "NUM": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "9"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "math_trig",
          "inputs": {
            "NUM": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "45"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "math_constant"
        },
        {
          "kind": "block",
          "type": "math_number_property",
          "inputs": {
            "NUMBER_TO_CHECK": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "math_round",
          "inputs": {
            "NUM": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "3.1"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "math_on_list"
        },
        {
          "kind": "block",
          "type": "math_modulo",
          "inputs": {
            "DIVIDEND": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "64"
                }
              }
            },
            "DIVISOR": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "10"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "math_constrain",
          "inputs": {
            "VALUE": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "50"
                }
              }
            },
            "LOW": {
              "shadow": {
              "type": "math_number",
                "fields": {
                  "NUM": "1"
                }
              }
            },
            "HIGH": {
              "shadow": {
              "type": "math_number",
                "fields": {
                "NUM": "100"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "math_random_int",
          "inputs": {
            "FROM": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "1"
                }
              }
            },
            "TO": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "100"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "math_random_float"
        },
        {
          "kind": "block",
          "type": "math_atan2",
          "inputs": {
            "X": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "1"
                }
              }
            },
            "Y": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "1"
                }
              }
            }
          }
        }      
      ],
      "categorystyle": "math_category"
    },
    { // Text
      "kind": "category",
      "name": translations['text']['ko'],
      "cssConfig": {
        "icon": "customIcon fa fa-t"
      },
      "contents": [
        {
          "kind": "block",
          "type": "text"
        },
        {
          "kind": "block",
          "type": "text_join"
        },
        {
          "kind": "block",
          "type": "text_append",
          "inputs": {
            "TEXT": {
              "shadow": {
                "type": "text"
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "text_length",
          "inputs": {
            "VALUE": {
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "abc"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "text_isEmpty",
          "inputs": {
            "VALUE": {
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": null
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "text_indexOf",
          "inputs": {
            "VALUE": {
              "block": {
                "type": "variables_get",
                "fields": {
                  "VAR": "{textVariable}"
                }
              }
            },
            "FIND": {
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "abc"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "text_charAt",
          "inputs": {
            "VALUE": {
              "block": {
                "type": "variables_get",
                "fields": {
                  "VAR": "{textVariable}"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "text_getSubstring",
          "inputs": {
            "STRING": {
              "block": {
                "type": "variables_get",
                "fields": {
                  "VAR": "{textVariable}"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "text_changeCase",
          "inputs": {
            "TEXT": {
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "abc"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "text_trim",
          "inputs": {
            "TEXT": {
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "abc"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "text_count",
          "inputs": {
            "SUB": {
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "a"
                }
              }
            },
            "TEXT": {
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "abc"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "text_replace",
          "inputs": {
            "FROM": {
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "m"
                }
              }
            },
            "TO": {
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "w"
                }
              }
            },
            "TEXT": {
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "abc"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "text_reverse",
          "inputs": {
            "TEXT": {
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "abc"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "text_print",
          "inputs": {
            "TEXT": {
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "abc"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "text_prompt_ext",
          "inputs": {
            "TEXT": {
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "abc"
                }
              }
            }
          }
        },
      ],
      "categorystyle": "text_category"
    },
    { // Lists
      "kind": "category",
      "name": translations['lists']['ko'],
      "cssConfig": {
        "icon": "customIcon fa fa-list"
      },
      "contents": [
        {
          "kind": "block",
          "type": "lists_create_with",
          "extraState": {
            "itemCount": "0"
          }
        },
        {
          "kind": "block",
          "type": "lists_create_with"
        },
        {
          "kind": "block",
          "type": "lists_repeat",
          "inputs": {
            "NUM": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "5"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "lists_length"
        },
        {
          "kind": "block",
          "type": "lists_isEmpty"
        },
        {
          "kind": "block",
          "type": "lists_indexOf",
          "inputs": {
            "VALUE": {
              "block": {
                "type": "variables_get",
                "fields": {
                  "VAR": "{listVariable}"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "lists_getIndex",
          "inputs": {
            "VALUE": {
              "block": {
                "type": "variables_get",
                "fields": {
                  "VAR": "{listVariable}"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "lists_setIndex",
          "inputs": {
            "LIST": {
              "block": {
                "type": "variables_get",
                "fields": {
                  "VAR": "{listVariable}"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "lists_getSublist",
          "inputs": {
            "LIST": {
              "block": {
                "type": "variables_get",
                "fields": {
                  "VAR": "{listVariable}"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "lists_split",
          "inputs": {
            "DELIM": {
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": ","
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "lists_sort"
        },
        {
          "kind": "block",
          "type": "lists_reverse"
        },
      ],
      "categorystyle": "list_category"
    },
    { // Colour
      "kind": "category",
      "name": translations['colour']['ko'],
      "cssConfig": {
        "icon": "customIcon fa fa-palette"
      },
      "contents": [
        {
          "kind": "block",
          "type": "colour_picker"
        },
        {
          "kind": "block",
          "type": "colour_random"
        },
        {
          "kind": "block",
          "type": "colour_rgb",
          "inputs": {
            "RED": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "100"
                }
              }
            },
            "GREEN": {
              "shadow": {
                "type": "math_number",
                  "fields": {
                "NUM": "50"
                }
              }
            },
            "BLUE": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "colour_blend",
          "inputs": {
            "COLOUR1": {
              "shadow": {
                "type": "colour_picker",
                "fields": {
                  "COLOUR": "#ff0000"
                }
              }
            },
            "COLOUR2": {
              "shadow": {
                "type": "colour_picker",
                "fields": {
                  "COLOUR": "#3333ff"
                }
              }
            },
            "RATIO": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0.5"
                }
              }
            }
          }
        }
      ],
      "categorystyle": "colour_category"
    },
    {
      "kind": "sep"
    },
    { // Variables
      "kind": "category",
      "name": translations['variables']['ko'],
      "contents": [],
      "custom": "VARIABLE",
      "categorystyle": "variable_category",
      "cssConfig": {
        "icon": "customIcon fa fa-v"
      }
    },
    { // Functions
      "kind": "category",
      "name": translations['functions']['ko'],
      "contents": [],
      "custom": "PROCEDURE",
      "categorystyle": "procedure_category",
      "cssConfig": {
        "icon": "customIcon fa fa-florin-sign"
      }
    },
    {
      "kind": "sep",
    },
    { // Audio
      "kind": "category",
      "name": translations['audio']['ko'],
      "contents": [
        {
          "kind": "block",
          "type": "audio_play",
          "inputs":{
            "filename":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": translations['audio_filename']['ko']
                }
              }
            },
            "volume": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "80"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "audio_stop",
        },
        {
          "kind": "block",
          "type": "audio_record",
          "inputs":{
            "filename":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": translations['audio_filename']['ko']
                }
              }
            },
            "timeout": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "5"
                }
              }
            }
          }
        }
      ],
      "colour": color_type["audio"],
      "cssConfig": {
        "icon": "customIcon fa-solid fa-music"
      }
    },
    { // Collect
      "kind": "category",
      "name": translations['collect']['ko'],
      "contents": [
        {
          "kind": "block",
          "type": "wikipedia_search",
          "inputs":{
            "topic":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "로봇"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "weather_search",
        },
        {
          "kind": "block",
          "type": "news_search",
        },
      ],
      "colour": color_type["collect"],
      "cssConfig": {
        "icon": "customIcon fa-solid fa-magnifying-glass-chart"
      }
    },
    { // Device
      "kind": "category",
      "name": translations['device']['ko'],
      "contents": [
        {
          "kind": "block",
          "type": "device_eye_on",
          "inputs":{
            "val0": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "val1": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "val2": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "val3": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "val4": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "val5": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "device_eye_colour_on",
          "inputs":{
            "left":{
              "shadow": {
                "type": "variables_get",
              }
            },
            "right":{
              "shadow": {
                "type": "variables_get",
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "device_eye_off",
        },
        {
          "kind": "block",
          "type": "device_get_dc",
        },
        {
          "kind": "block",
          "type": "device_get_battery",
        },
        {
          "kind": "block",
          "type": "device_get_system",
        },
        {
          "kind": "block",
          "type": "device_get_pir",
        },
        {
          "kind": "block",
          "type": "device_get_touch",
        },
        {
          "kind": "block",
          "type": "device_get_button",
        },
      ],
      "colour": color_type["device"],
      "cssConfig": {
        "icon": "customIcon fa-solid fa-walkie-talkie"
      }
    },
    { // Motion
      "kind": "category",
      "name": translations['motion']['ko'],
      "contents": [
        {
          "kind": "block",
          "type": "motion_get_motion",
        },
        {
          "kind": "block",
          "type": "motion_get_mymotion",
        },
        {
          "kind": "block",
          "type": "motion_set_motion",
          "inputs":{
            "name":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "wave1"
                }
              }
            },
            "cycle": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "1"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "motion_set_mymotion",
          "inputs":{
            "name":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": translations['mymotion']['ko']
                }
              }
            },
            "cycle": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "1"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "motion_init_motion",
        },
        {
          "kind": "block",
          "type": "motion_set_motor",
          "inputs":{
            "pos": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "motion_set_speed",
          "inputs":{
            "val": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "40"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "motion_set_acceleration",
          "inputs":{
            "val": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            }
          }
        },
      ],
      "colour": color_type["motion"],
      "cssConfig": {
        "icon": "customIcon fa-solid fa-person-walking"
      }
    },
    { // Oled
      "kind": "category",
      "name": translations['oled']['ko'],
      "contents": [
        {
          "kind": "block",
          "type": "oled_set_font",
          "inputs":{
            "size": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "10"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "oled_draw_text",
          "inputs":{
            "x": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "y": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "text":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "안녕하세요."
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "oled_draw_image",
          "inputs":{
            "filename":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": translations['image_filename']['ko']
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "oled_draw_rectangle",
          "inputs":{
            "x1": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "y1": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "x2": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "y2": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
          }
        },
        {
          "kind": "block",
          "type": "oled_draw_ellipse",
          "inputs":{
            "x1": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "y1": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "x2": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "y2": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
          }
        },
        {
          "kind": "block",
          "type": "oled_draw_line",
          "inputs":{
            "x1": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "y1": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "x2": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
            "y2": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "0"
                }
              }
            },
          }
        },
        {
          "kind": "block",
          "type": "oled_invert",
        },
        {
          "kind": "block",
          "type": "oled_show",
        },
        {
          "kind": "block",
          "type": "oled_clear",
        },
      ],
      "colour": color_type["oled"],
      "cssConfig": {
        "icon": "customIcon fa-solid fa-display"
      }
    },
    { // Speech
      "kind": "category",
      "name": translations['speech']['ko'],
      "contents": [
        {
          "kind": "block",
          "type": "speech_stt",
          "inputs":{
            "timeout": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "5"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "speech_tts",
          "inputs":{
            "text":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "안녕하세요."
                }
              }
            },
            "filename":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": translations['audio_filename']['ko']
                }
              }
            },
          }
        },
        {
          "kind": "block",
          "type": "speech_get_dialog",
          "inputs":{
            "text":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "안녕하세요."
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "speech_load_dialog",
          "inputs":{
            "filename":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "csv 파일이름"
                }
              }
            }
          }
        }
      ],
      "colour": color_type["speech"],
      "cssConfig": {
        "icon": "customIcon fa-solid fa-comment-dots"
      }
    },
    { // Vision
      "kind": "category",
      "name": translations['vision']['ko'],
      "contents": [
        {
          "kind": "block",
          "type": "vision_read",
        },
        {
          "kind": "block",
          "type": "vision_imread",
          "inputs":{
            "filename":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": translations['image_filename']['ko']
                }
              }
            },
          }
        },
        {
          "kind": "block",
          "type": "vision_imwrite",
          "inputs":{
            "filename":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": translations['image_filename']['ko']
                }
              }
            },
            "img":{
              "shadow":{
                "type":"variables_get",
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "vision_imshow_to_ide",
          "inputs":{
            "filename":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": translations['image_filename']['ko']
                }
              }
            },
          }
        },
        {
          "kind": "block",
          "type": "vision_transfer",
          "inputs":{
            "img":{
              "shadow": {
                "type": "variables_get",
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "vision_object",
          "inputs":{
            "img":{
              "shadow": {
                "type": "variables_get",
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "vision_qr",
          "inputs":{
            "img":{
              "shadow": {
                "type": "variables_get",
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "vision_pose",
          "inputs":{
            "img":{
              "shadow": {
                "type": "variables_get",
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "vision_analyze_pose",
          "inputs":{
            "val":{
              "shadow": {
                "type": "variables_get",
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "vision_classification",
          "inputs":{
            "img":{
              "shadow": {
                "type": "variables_get",
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "vision_load_tm",
          "inputs":{
            "modelpath":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "모델 파일이름"
                }
              }
            },
            "labelpath":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "라벨 파일이름"
                }
              }
            },
          }
        },
        {
          "kind": "block",
          "type": "vision_predict_tm",
          "inputs":{
            "img":{
              "shadow": {
                "type": "variables_get",
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "vision_call_ai",
          "inputs":{
            "filename":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": translations['image_filename']['ko']
                }
              }
            },
          }
        },
      ],
      "colour": color_type["vision"],
      "cssConfig": {
        "icon": "customIcon fa-solid fa-camera-retro"
      }
    },
    { // Utils
      "kind": "category",
      "name": translations['utils']['ko'],
      "contents": [
        {
          "kind": "block",
          "type": "utils_sleep",
          "inputs":{
            "time": {
              "shadow": {
                "type": "math_number",
                "fields": {
                  "NUM": "1"
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "utils_time",
        },
        {
          "kind": "block",
          "type": "utils_current_time",
        },
        {
          "kind": "block",
          "type": "utils_include",
        },
        {
          "kind": "block",
          "type": "utils_dict",
          "inputs":{
            "dictionary":{
              "shadow":{
                "type":"variables_get",
              }
            },
            "keyname":{
              "shadow": {
                "type": "text",
                "fields": {
                  "TEXT": "키 이름"
                }
              }
            },
          }
        },
      ],
      "colour": color_type["utils"],
      "cssConfig": {
        "icon": "customIcon fa-solid fa-toolbox"
      }
    },
  ]
};
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview The toolbox category built during the custom toolbox codelab, in es6.
 * @author aschmiedt@google.com (Abby Schmiedt)
 */

class CustomCategory extends Blockly.ToolboxCategory {
  /**
   * Constructor for a custom category.
   * @override
   */
  constructor(categoryDef, toolbox, opt_parent) {
    super(categoryDef, toolbox, opt_parent);
  }

  /**
   * Adds the colour to the toolbox.
   * This is called on category creation and whenever the theme changes.
   * @override
   */
  addColourBorder_(colour){
    this.rowDiv_.style.backgroundColor = colour;
  }

  /**
   * Sets the style for the category when it is selected or deselected.
   * @param {boolean} isSelected True if the category has been selected,
   *     false otherwise.
   * @override
   */
  setSelected(isSelected){
    // We do not store the label span on the category, so use getElementsByClassName.
    var labelDom = this.rowDiv_.getElementsByClassName('blocklyTreeLabel')[0];
    if (isSelected) {
      // Change the background color of the div to white.
      this.rowDiv_.style.backgroundColor = 'white';
      // Set the colour of the text to the colour of the category.
      labelDom.style.color = this.colour_;
      //this.iconDom_.style.color = this.colour_;
    } else {
      // Set the background back to the original colour.
      this.rowDiv_.style.backgroundColor = this.colour_;
      // Set the text back to white.
      labelDom.style.color = 'white';
      //this.iconDom_.style.color = 'white';
    }
    // This is used for accessibility purposes.
    Blockly.utils.aria.setState(/** @type {!Element} */ (this.htmlDiv_),
        Blockly.utils.aria.State.SELECTED, isSelected);
  }

  // /**
  //  * Creates the dom used for the icon.
  //  * @returns {HTMLElement} The element for the icon.
  //  * @override
  //  */
  //  createIconDom_() {
  //    const iconImg = document.createElement('img');
  //   iconImg.src = 'svg/camera-solid.svg';
  //   iconImg.alt = 'Blockly Logo';
  //    iconImg.width = '25';
  //    iconImg.height = '25';
  //    return iconImg;
  // }
}

Blockly.registry.register(
    Blockly.registry.Type.TOOLBOX_ITEM,
    Blockly.ToolboxCategory.registrationName,
    CustomCategory, true);