let toolbox = (lang) => {
  return {
    "kind": "categoryToolbox",
    // "kind": "flyoutToolbox",
    "contents": [

      { // start
        "kind": "category",
        "name": translations['start'][lang],
        "contents": [
          {
            "kind": "block",
            "type": "flag_event",
          },
        ],
        "colour": color_type['start'],
        "cssConfig": {
          "icon": "customIcon fa-solid fa-circle-play"
        }
      },     
      {
        "kind": "sep",
      },
      { // Logic
        "kind": "category",
        "colour": '#B098CB',
        "name": translations['logic'][lang],
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
        // "categorystyle": "logic_category"
      },
      { // Loops
        "kind": "category",
        "colour": '#85B687',
        "name": translations['loops'][lang],
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
        // "categorystyle": "loop_category"
      },
      { // Math
        "kind": "category",
        "colour": '#2196F3',
        "name": translations['math'][lang],
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
        // "categorystyle": "math_category"
      },
      { // Text
        "kind": "category",
        "colour": '#FFAA08',
        "name": translations['text'][lang],
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
                    "TEXT": translations["abc"][lang]
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
                    "TEXT": translations["abc"][lang]
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
                    "TEXT": translations["abc"][lang]
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
                    "TEXT": translations["abc"][lang]
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
                    "TEXT": translations["a"][lang]
                  }
                }
              },
              "TEXT": {
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": translations["abc"][lang]
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
                    "TEXT": translations["b"][lang]
                  }
                }
              },
              "TO": {
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": translations["c"][lang]
                  }
                }
              },
              "TEXT": {
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": translations["abc"][lang]
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
                    "TEXT": translations["abc"][lang]
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
                    "TEXT": translations["abc"][lang]
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
                    "TEXT": translations["abc"][lang]
                  }
                }
              }
            }
          },
        ],
        // "categorystyle": "text_category"
      },
      { // Lists
        "kind": "category",
        "colour": '#4DB6AC',
        "name": translations['lists'][lang],
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
        // "categorystyle": "list_category"
      },
      { // Colour
        "kind": "category",
        "colour": '#DFADB2',
        "name": translations['colour'][lang],
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
        // "categorystyle": "colour_category"
      },
      {
        "kind": "sep"
      },
      { // Variables
        "kind": "category",
        "colour": '#EF9A9A',
        "name": translations['variables'][lang],
        "contents": [],
        "custom": "VARIABLE",
        // "categorystyle": "variable_category",
        "cssConfig": {
          "icon": "customIcon fa fa-v"
        }
      },
      { // Functions
        "kind": "category",
        "colour": '#C7BCB8',
        "name": translations['functions'][lang],
        "contents": [],
        "custom": "PROCEDURE",
        // "categorystyle": "procedure_category",
        "cssConfig": {
          "icon": "customIcon fa fa-florin-sign"
        }
      },
      {
        "kind": "sep",
      },
      { // Audio
        "kind": "category",
        "name": translations['audio'][lang],
        "contents": [
          {
            "kind": "block",
            "type": "audio_play_dynamic",
            "inputs":{
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
            "type": "audio_play",
            "inputs":{
              "filename":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": "audio"
                    // "TEXT": translations['audio_filename'][lang]
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
          // {
          //   "kind": "block",
          //   "type": "audio_record",
          //   "disabled":"true",
          //   "inputs":{
          //     "filename":{
          //       "shadow": {
          //         "type": "text",
          //         "fields": {
          //           "TEXT": "audio"
          //           // "TEXT": translations['audio_filename'][lang]
          //         }
          //       }
          //     },
          //     "timeout": {
          //       "shadow": {
          //         "type": "math_number",
          //         "fields": {
          //           "NUM": "5"
          //         }
          //       }
          //     }
          //   }
          // }
        ],
        "colour": color_type["audio"],
        "cssConfig": {
          "icon": "customIcon fa-solid fa-music"
        }
      },
      { // Collect
        "kind": "category",
        "name": translations['collect'][lang],
        "contents": [
          {
            "kind": "block",
            "type": "wikipedia_search",
            "inputs":{
              "topic":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": translations['robot'][lang]
                  }
                }
              }
            }
          },
          {
            "kind": "block",
            "type": "weather_forecast",
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
        "name": translations['device'][lang],
        "contents": [
          // {
          //   "kind": "block",
          //   "type": "device_eye_on",
          //   "disabled":"true",
          //   "inputs":{
          //     "val0": {
          //       "shadow": {
          //         "type": "math_number",
          //         "fields": {
          //           "NUM": "0"
          //         }
          //       }
          //     },
          //     "val1": {
          //       "shadow": {
          //         "type": "math_number",
          //         "fields": {
          //           "NUM": "0"
          //         }
          //       }
          //     },
          //     "val2": {
          //       "shadow": {
          //         "type": "math_number",
          //         "fields": {
          //           "NUM": "0"
          //         }
          //       }
          //     },
          //     "val3": {
          //       "shadow": {
          //         "type": "math_number",
          //         "fields": {
          //           "NUM": "0"
          //         }
          //       }
          //     },
          //     "val4": {
          //       "shadow": {
          //         "type": "math_number",
          //         "fields": {
          //           "NUM": "0"
          //         }
          //       }
          //     },
          //     "val5": {
          //       "shadow": {
          //         "type": "math_number",
          //         "fields": {
          //           "NUM": "0"
          //         }
          //       }
          //     }
          //   }
          // },
          // {
          //   "kind": "block",
          //   "type": "device_eye_colour_on",
          //   "disabled":"true",
          //   "inputs":{
          //     "left":{
          //       "shadow": {
          //         "type": "variables_get",
          //       }
          //     },
          //     "right":{
          //       "shadow": {
          //         "type": "variables_get",
          //       }
          //     }
          //   }
          // },
          // {
          //   "kind": "block",
          //   "type": "device_get_dc",
          //   "disabled":"true",
          // },
          // {
          //   "kind": "block",
          //   "type": "device_get_battery",
          //   "disabled":"true",
          // },
          // {
          //   "kind": "block",
          //   "type": "device_get_system",
          //   "disabled":"true",
          // },
          // {
          //   "kind": "block",
          //   "type": "device_get_pir",
          //   "disabled":"true",
          // },
          // {
          //   "kind": "block",
          //   "type": "device_get_touch",
          //   "disabled":"true",
          // },
          // {
          //   "kind": "block",
          //   "type": "device_get_button",
          //   "disabled":"true",
          // },
          {
            "kind": "block",
            "type": "device_pibrain_button",
            //"disabled":"true",
          },
          {
            "kind": "block",
            "type": "device_pibrain_led_on",
            //"disabled":"true",
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
            }
          },
          {
            "kind": "block",
            "type": "device_pibrain_led_colour_on",
            //"disabled":"true",
            "inputs":{
              "color":{
                "shadow": {
                  "type": "variables_get",
                }
              }
            }
          },
          {
            "kind": "block",
            "type": "device_pibrain_led_off",
          },
          {
            "kind": "block",
            "type": "device_pibrain_uart_init",
          },
          {
            "kind": "block",
            "type": "device_pibrain_uart_send",
            "inputs":{
              "command":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": ""
                    // "TEXT": translations['image_filename'][lang]
                  }
                }
              }
            }
          },
          {
            "kind": "block",
            "type": "device_pibrain_uart_close",
          },
        ],
        "colour": color_type["device"],
        "cssConfig": {
          "icon": "customIcon fa-solid fa-walkie-talkie"
        }
      },
      // { // Motion
      //   "kind": "category",
      //   "name": translations['motion'][lang],
      //   "hidden":"true",
      //   "contents": [
      //     {
      //       "kind": "block",
      //       "type": "motion_get_motion",
      //     },
      //     {
      //       "kind": "block",
      //       "type": "motion_get_mymotion",
      //     },
      //     {
      //       "kind": "block",
      //       "type": "motion_set_motion_dropdown",
      //       "inputs":{
      //         "cycle": {
      //           "shadow": {
      //             "type": "math_number",
      //             "fields": {
      //               "NUM": "1"
      //             }
      //           }
      //         }
      //       }
      //     },
      //     {
      //       "kind": "block",
      //       "type": "motion_set_motion",
      //       "inputs":{
      //         "name":{
      //           "shadow": {
      //             "type": "text",
      //             "fields": {
      //               "TEXT": "wave1"
      //             }
      //           }
      //         },
      //         "cycle": {
      //           "shadow": {
      //             "type": "math_number",
      //             "fields": {
      //               "NUM": "1"
      //             }
      //           }
      //         }
      //       }
      //     },
      //     {
      //       "kind": "block",
      //       "type": "motion_set_mymotion",
      //       "inputs":{
      //         "name":{
      //           "shadow": {
      //             "type": "text",
      //             "fields": {
      //               "TEXT": translations['mymotion'][lang]
      //             }
      //           }
      //         },
      //         "cycle": {
      //           "shadow": {
      //             "type": "math_number",
      //             "fields": {
      //               "NUM": "1"
      //             }
      //           }
      //         }
      //       }
      //     },
      //     {
      //       "kind": "block",
      //       "type": "motion_init_motion",
      //     },
      //     {
      //       "kind": "block",
      //       "type": "motion_set_motor",
      //       "inputs":{
      //         "pos": {
      //           "shadow": {
      //             "type": "math_number",
      //             "fields": {
      //               "NUM": "0"
      //             }
      //           }
      //         }
      //       }
      //     },
      //     {
      //       "kind": "block",
      //       "type": "motion_set_speed",
      //       "inputs":{
      //         "val": {
      //           "shadow": {
      //             "type": "math_number",
      //             "fields": {
      //               "NUM": "40"
      //             }
      //           }
      //         }
      //       }
      //     },
      //     {
      //       "kind": "block",
      //       "type": "motion_set_acceleration",
      //       "inputs":{
      //         "val": {
      //           "shadow": {
      //             "type": "math_number",
      //             "fields": {
      //               "NUM": "0"
      //             }
      //           }
      //         }
      //       }
      //     },
      //     {
      //       "kind": "block",
      //       "type": "motion_set_motors",
      //       "inputs":{
      //         "val_list":{
      //           "shadow": {
      //             "type": "text",
      //             "fields": {
      //               "TEXT": "0,0,0,0,0,0,0,0,0,0"
      //             }
      //           }
      //         },
      //         "time": {
      //           "shadow": {
      //             "type": "math_number",
      //             "fields": {
      //               "NUM": "1000"
      //             }
      //           }
      //         }
      //       }
      //     },
      //   ],
      //   "colour": color_type["motion"],
      //   "cssConfig": {
      //     "icon": "customIcon fa-solid fa-person-walking"
      //   }
      // },
      { // Oled
        "kind": "category",
        "name": translations['oled'][lang],
        "contents": [
          {
            "kind": "block",
            "type": "oled_set_font",
            "inputs":{
              "size": {
                "shadow": {
                  "type": "math_number",
                  "fields": {
                    "NUM": "30"
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
                    "TEXT": translations['sample_text'][lang]
                  }
                }
              }
            }
          },
          {
            "kind": "block",
            "type": "oled_draw_image_dynamic",
          },
          {
            "kind": "block",
            "type": "oled_draw_image",
            "inputs":{
              "filename":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": "sample"
                    // "TEXT": translations['image_filename'][lang]
                  }
                }
              }
            }
          },
          {
            "kind": "block",
            "type": "oled_draw_data",
            "inputs":{
              "img":{
                "shadow":{
                  "type":"variables_get",
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
        "name": translations['speech'][lang],
        "contents": [
          {
            "kind": "block",
            "type": "speech_stt",
            "disabled":"true",
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
                    "TEXT": translations['sample_text'][lang]
                  }
                }
              },
              "filename":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": "tts"
                    // "TEXT": translations['audio_filename'][lang]
                  }
                }
              },
            }
          },
          {
            "kind": "block",
            "type": "speech_tts_play",
            "inputs":{
              "text":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": translations['sample_text'][lang]
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
            "type": "speech_gtts",
            "inputs":{
              "text":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": translations['sample_text'][lang]
                  }
                }
              },
              "filename":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": "tts"
                    // "TEXT": translations['audio_filename'][lang]
                  }
                }
              },
            }
          },
          {
            "kind": "block",
            "type": "speech_gtts_play",
            "inputs":{
              "text":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": translations['sample_text'][lang]
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
            "type": "speech_otts",
            "inputs":{
              "text":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": translations['sample_text'][lang]
                  }
                }
              },
              "filename":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": "tts"
                    // "TEXT": translations['audio_filename'][lang]
                  }
                }
              },
            }
          },
          {
            "kind": "block",
            "type": "speech_otts_play",
            "inputs":{
              "text":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": translations['sample_text'][lang]
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
            "type": "speech_etts",
            "inputs":{
              "text":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": translations['sample_text'][lang]
                  }
                }
              },
              "filename":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": "tts"
                    // "TEXT": translations['audio_filename'][lang]
                  }
                }
              },
            }
          },
          {
            "kind": "block",
            "type": "speech_etts_play",
            "inputs":{
              "text":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": translations['sample_text'][lang]
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
            "type": "speech_translate",
            "inputs":{
              "text":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": translations['sample_text'][lang]
                  }
                }
              }
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
                    "TEXT": translations['sample_text'][lang]
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
                    "TEXT": "dialog"
                    // "TEXT": translations["csv_filename"][lang]
                  }
                }
              }
            }
          },
          {
            "kind": "block",
            "type": "speech_reset_dialog",
          },
          {
            "kind": "block",
            "type": "speech_start_llm",
          },
          {
            "kind": "block",
            "type": "speech_call_llm",
            "inputs":{
              "text":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": translations['sample_text'][lang]
                  }
                }
              },
              "system_prompt":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": ""
                  }
                }
              }
            }
          },
          {
            "kind": "block",
            "type": "speech_stop_llm",
          },
        ],
        "colour": color_type["speech"],
        "cssConfig": {
          "icon": "customIcon fa-solid fa-comment-dots"
        }
      },
      { // Vision
        "kind": "category",
        "name": translations['vision'][lang],
        "contents": [
          {
            "kind": "block",
            "type": "vision_read",
          },
          {
            "kind": "block",
            "type": "vision_imread_dynamic",
          },
          {
            "kind": "block",
            "type": "vision_imread",
            "inputs":{
              "filename":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": "image"
                    // "TEXT": translations["image_filename"][lang]
                  }
                }
              },
            }
          },
          {
            "kind": "block",
            "type": "vision_create_matte",
            "inputs":{
              "color":{
                "shadow":{
                  "type":"variables_get",
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
                    "TEXT": "image"
                    // "TEXT": translations["image_filename"][lang]
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
              "img":{
                "shadow":{
                  "type":"variables_get",
                }
              }
            }
          },
          {
            "kind": "block",
            "type": "vision_imshow_to_oled",
            "inputs":{
              "img":{
                "shadow":{
                  "type":"variables_get",
                }
              }
            }
          },          
          {
            "kind": "block",
            "type": "vision_rectangle",
            "inputs":{
              "img":{
                "shadow":{
                  "type":"variables_get",
                }
              },
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
              "color":{
                "shadow":{
                  "type":"variables_get",
                }
              },
              "tickness": {
                "shadow": {
                  "type": "math_number",
                  "fields": {
                    "NUM": "2"
                  }
                }
              },
            }
          },
          {
            "kind": "block",
            "type": "vision_circle",
            "inputs":{
              "img":{
                "shadow":{
                  "type":"variables_get",
                }
              },
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
              "r": {
                "shadow": {
                  "type": "math_number",
                  "fields": {
                    "NUM": "0"
                  }
                }
              },
              "color":{
                "shadow":{
                  "type":"variables_get",
                }
              },
              "tickness": {
                "shadow": {
                  "type": "math_number",
                  "fields": {
                    "NUM": "2"
                  }
                }
              },
            }
          },
          {
            "kind": "block",
            "type": "vision_line",
            "inputs":{
              "img":{
                "shadow":{
                  "type":"variables_get",
                }
              },
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
              "color":{
                "shadow":{
                  "type":"variables_get",
                }
              },
              "tickness": {
                "shadow": {
                  "type": "math_number",
                  "fields": {
                    "NUM": "2"
                  }
                }
              },
            }
          },
          {
            "kind": "block",
            "type": "vision_text",
            "inputs":{
              "img":{
                "shadow":{
                  "type":"variables_get",
                }
              },
              "text":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": translations["sample_text"][lang]
                  }
                }
              },
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
              "size": {
                "shadow": {
                  "type": "math_number",
                  "fields": {
                    "NUM": "30"
                  }
                }
              },
              "color":{
                "shadow":{
                  "type":"variables_get",
                }
              }
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
            "type": "vision_resize",
            "inputs":{
              "img":{
                "shadow": {
                  "type": "variables_get",
                }
              },
              "w": {
                "shadow": {
                  "type": "math_number",
                  "fields": {
                    "NUM": "100"
                  }
                }
              },
              "h": {
                "shadow": {
                  "type": "math_number",
                  "fields": {
                    "NUM": "100"
                  }
                }
              },              
            }
          },
          {
            "kind": "block",
            "type": "make_bitmap_6x8",
          },
          {
            "kind": "block",
            "type": "make_bitmap_8x4",
          },
          {
            "kind": "block",
            "type": "make_bitmap_8x8",
          },

        ],
        "colour": color_type["vision"],
        "cssConfig": {
          "icon": "customIcon fa-solid fa-camera-retro"
        }
      },
      { // recognition
        "kind": "category",
        "name": translations['recognition'][lang],
        "contents": [
          {
            "kind": "block",
            "type": "vision_face_detect",
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
            "type": "vision_face_detect_vis",
            "inputs":{
              "img":{
                "shadow": {
                  "type": "variables_get",
                }
              },
              "v":{
                "shadow": {
                  "type": "variables_get",
                }
              }
            }
          },
          {
            "kind": "block",
            "type": "vision_face_analyze",
            "inputs":{
              "img":{
                "shadow": {
                  "type": "variables_get",
                }
              },
              "v":{
                "shadow": {
                  "type": "variables_get",
                }
              }
            }
          },
          {
            "kind": "block",
            "type": "vision_face_analyze_vis",
            "inputs":{
              "img":{
                "shadow": {
                  "type": "variables_get",
                }
              },
              "v":{
                "shadow": {
                  "type": "variables_get",
                }
              }
            }
          },         
          {
            "kind": "block",
            "type": "vision_face_landmark",
            "inputs":{
              "img":{
                "shadow": {
                  "type": "variables_get",
                }
              },
              "v":{
                "shadow": {
                  "type": "variables_get",
                }
              }
            }
          },
          {
            "kind": "block",
            "type": "vision_face_landmark_vis",
            "inputs":{
              "img":{
                "shadow": {
                  "type": "variables_get",
                }
              },
              "v":{
                "shadow": {
                  "type": "variables_get",
                }
              }
            }
          },
          {
            "kind": "block",
            "type": "vision_facedb"
          },          
          {
            "kind": "block",
            "type": "vision_facedb_train",
            "inputs":{
              "img":{
                "shadow": {
                  "type": "variables_get",
                }
              },
              "v":{
                "shadow": {
                  "type": "variables_get",
                }
              },
              "name":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": "pibo"
                    // "TEXT": translations["image_filename"][lang]
                  }
                }
              },
            }
          },
          {
            "kind": "block",
            "type": "vision_facedb_delete",
            "inputs":{
              "name":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": "pibo"
                    // "TEXT": translations["image_filename"][lang]
                  }
                }
              },
            }
          },
          {
            "kind": "block",
            "type": "vision_facedb_recognize",
            "inputs":{
              "img":{
                "shadow": {
                  "type": "variables_get",
                }
              },
              "v":{
                "shadow": {
                  "type": "variables_get",
                }
              },
            }
          },
          {
            "kind": "block",
            "type": "vision_facedb_save",
            "inputs":{
              "filename":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": "facedb"
                    // "TEXT": translations["image_filename"][lang]
                  }
                }
              },
            }
          },
          {
            "kind": "block",
            "type": "vision_facedb_load",
            "inputs":{
              "filename":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": "facedb"
                    // "TEXT": translations["image_filename"][lang]
                  }
                }
              },
            }
          },
          {
            "kind": "block",
            "type": "vision_face_mesh",
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
            "type": "vision_face_mesh_vis",
            "inputs":{
              "img":{
                "shadow": {
                  "type": "variables_get",
                }
              },
              "v":{
                "shadow": {
                  "type": "variables_get",
                }
              }
            }
          },
          {
            "kind": "block",
            "type": "vision_object_load_ext",
            "inputs":{
              "filename":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": "yolo11s"
                  }
                }
              },
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
            "type": "vision_object_raw",
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
            "type": "vision_object_vis",
            "inputs":{
              "img":{
                "shadow": {
                  "type": "variables_get",
                }
              },
              "v":{
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
            "type": "vision_qr_raw",
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
            "type": "vision_qr_vis",
            "inputs":{
              "img":{
                "shadow": {
                  "type": "variables_get",
                }
              },
              "v":{
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
            "type": "vision_pose_vis",
            "inputs":{
              "img":{
                "shadow": {
                  "type": "variables_get",
                }
              },
              "v":{
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
              "v":{
                "shadow": {
                  "type": "variables_get",
                }
              }
            }
          },
          // {
          //   "kind": "block",
          //   "type": "vision_classification",
          //   "inputs":{
          //     "img":{
          //       "shadow": {
          //         "type": "variables_get",
          //       }
          //     }
          //   }
          // },
          {
            "kind": "block",
            "type": "vision_object_tracker_init",
            "inputs":{
              "img":{
                "shadow":{
                  "type":"variables_get",
                }
              },
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
            "type": "vision_object_track",
            "inputs":{
              "img":{
                "shadow":{
                  "type":"variables_get",
                }
              },
            }
          },
          {
            "kind": "block",
            "type": "vision_object_track_vis",
            "inputs":{
              "img":{
                "shadow":{
                  "type":"variables_get",
                }
              },
              "v":{
                "shadow": {
                  "type": "variables_get",
                }
              }
            }
          },
          {
            "kind": "block",
            "type": "vision_hand_gesture_load",
          },
          {
            "kind": "block",
            "type": "vision_hand_gesture_load_ext",
            "inputs":{
              "filename":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": "gesture_recognizer"
                  }
                }
              },
            }
          },
          {
            "kind": "block",
            "type": "vision_hand_gesture",
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
            "type": "vision_hand_gesture_vis",
            "inputs":{
              "img":{
                "shadow": {
                  "type": "variables_get",
                }
              },
              "v":{
                "shadow": {
                  "type": "variables_get",
                }
              }
            }
          },  
          {
            "kind": "block",
            "type": "vision_marker_detect",
            "inputs":{
              "img":{
                "shadow":{
                  "type":"variables_get",
                }
              },
              "length": {
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
            "type": "vision_marker_detect_vis",
            "inputs":{
              "img":{
                "shadow":{
                  "type":"variables_get",
                }
              },
              "v":{
                "shadow": {
                  "type": "variables_get",
                }
              }
            }
          },
          /*
          {
            "kind": "block",
            "type": "vision_load_tm",
            "inputs":{
              "modelpath":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": "model_unquant.tflite"
                  }
                }
              },
              "labelpath":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": "labels.txt"
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
          */
          {
            "kind": "block",
            "type": "vision_load_cf",
            "inputs":{
              "modelpath":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": "model.keras"
                  }
                }
              },
              "labelpath":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": "labels.txt"
                  }
                }
              },
            }
          },
          {
            "kind": "block",
            "type": "vision_predict_cf",
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
            "type": "vision_call_ai_img",
            "inputs":{
              "img":{
                "shadow":{
                  "type":"variables_get",
                }
              }
            }
          },
          {
            "kind": "block",
            "type": "vision_call_ai_img_ext",
            "inputs":{
              "img":{
                "shadow":{
                  "type":"variables_get",
                }
              },
              "type":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": "object/object_search_e"
                    // "TEXT": translations["image_filename"][lang]
                  }
                }
              },
            }
          },
        ],
        "colour": color_type["recognition"],
        "cssConfig": {
          "icon": "customIcon fa-solid fa-magnifying-glass"
        }
      },
      { // Utils
        "kind": "category",
        "name": translations['utils'][lang],
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
            "type": "utils_dict_get",
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
                    "TEXT": translations['keyname'][lang]
                  }
                }
              },
            }
          },
          {
            "kind": "block",
            "type": "utils_dict_set",
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
                    "TEXT": translations['keyname'][lang]
                  }
                }
              },
            }
          },
          {
            "kind": "block",
            "type": "utils_dict_create",
          },

          {
            "kind": "block",
            "type": "utils_array_slice_set",
            "inputs":{
              "arr":{
                "shadow":{
                  "type":"variables_get",
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
              "y2": {
                "shadow": {
                  "type": "math_number",
                  "fields": {
                    "NUM": "0"
                  }
                }
              },
              "x1": {
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
              "value":{
                "shadow":{
                  "type":"variables_get",
                }
              },
            }
          },

          {
            "kind": "block",
            "type": "utils_check_path",
            "inputs":{
              "path":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": translations['path'][lang]
                  }
                }
              }
            }
          },
          {
            "kind": "block",
            "type": "utils_typecast_string",
            "inputs":{
              "value":{
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
            "type": "utils_typecast_number",
            "inputs":{
              "value":{
                "shadow": {
                  "type": "text",
                  "fields": {
                    "TEXT": "1"
                  }
                }
              }
            }
          },
          {
            "kind": "block",
            "type": "utils_calculate_angle",
            "inputs":{
              "p1":{
                "shadow":{
                  "type":"variables_get",
                }
              },
              "p2":{
                "shadow":{
                  "type":"variables_get",
                }
              },
              "p3":{
                "shadow":{
                  "type":"variables_get",
                }
              }                            
            }
          }
        ],
        "colour": color_type["utils"],
        "cssConfig": {
          "icon": "customIcon fa-solid fa-toolbox"
        }
      },
    ]
  } 
}
const toolbox_en = toolbox('en');
const toolbox_ko = toolbox('ko');
// const toolbox_cn = toolbox('cn');

const toolbox_dict = {
  "en": toolbox_en,
  "ko": toolbox_ko,
  // "cn": toolbox_cn
}
// /**
//  * @license
//  * Copyright 2020 Google LLC
//  * SPDX-License-Identifier: Apache-2.0
//  */

// /**
//  * @fileoverview The toolbox category built during the custom toolbox codelab, in es6.
//  * @author aschmiedt@google.com (Abby Schmiedt)
//  */

// class CustomCategory extends Blockly.ToolboxCategory {
//   /**
//    * Constructor for a custom category.
//    * @override
//    */
//   constructor(categoryDef, toolbox, opt_parent) {
//     super(categoryDef, toolbox, opt_parent);
//   }

//   /**
//    * Adds the colour to the toolbox.
//    * This is called on category creation and whenever the theme changes.
//    * @override
//    */
//   addColourBorder_(colour){
//     this.rowDiv_.style.backgroundColor = colour;
//   }

//   /**
//    * Sets the style for the category when it is selected or deselected.
//    * @param {boolean} isSelected True if the category has been selected,
//    *     false otherwise.
//    * @override
//    */
//   setSelected(isSelected){
//     // We do not store the label span on the category, so use getElementsByClassName.
//     var labelDom = this.rowDiv_.getElementsByClassName('blocklyTreeLabel')[0];
//     if (isSelected) {
//       // Change the background color of the div to white.
//       this.rowDiv_.style.backgroundColor = 'white';
//       // Set the colour of the text to the colour of the category.
//       labelDom.style.color = this.colour_;
//       //this.iconDom_.style.color = this.colour_;
//     } else {
//       // Set the background back to the original colour.
//       this.rowDiv_.style.backgroundColor = this.colour_;
//       // Set the text back to white.
//       labelDom.style.color = 'white';
//       //this.iconDom_.style.color = 'white';
//     }
//     // This is used for accessibility purposes.
//     Blockly.utils.aria.setState(/** @type {!Element} */ (this.htmlDiv_),
//         Blockly.utils.aria.State.SELECTED, isSelected);
//   }

//   // /**
//   //  * Creates the dom used for the icon.
//   //  * @returns {HTMLElement} The element for the icon.
//   //  * @override
//   //  */
//   //  createIconDom_() {
//   //    const iconImg = document.createElement('img');
//   //   iconImg.src = 'svg/camera-solid.svg';
//   //   iconImg.alt = 'Blockly Logo';
//   //    iconImg.width = '25';
//   //    iconImg.height = '25';
//   //    return iconImg;
//   // }
// }

// Blockly.registry.register(
//     Blockly.registry.Type.TOOLBOX_ITEM,
//     Blockly.ToolboxCategory.registrationName,
//     CustomCategory, true);
