/**
 * Structured Output Schemas for iOS Shortcuts
 * Using OpenRouter's JSON Schema validation
 */

/**
 * Shortcut action schema for structured outputs
 */
export const SHORTCUT_ACTION_SCHEMA = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      description: 'iOS Shortcut action identifier (e.g., is.workflow.actions.url)'
    },
    parameters: {
      type: 'object',
      description: 'Action parameters as key-value pairs',
      additionalProperties: true
    }
  },
  required: ['type', 'parameters'],
  additionalProperties: false
};

/**
 * Complete shortcut schema for structured outputs
 */
export const SHORTCUT_SCHEMA = {
  name: 'ios_shortcut',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the shortcut'
      },
      actions: {
        type: 'array',
        description: 'Array of actions that make up the shortcut',
        items: SHORTCUT_ACTION_SCHEMA,
        minItems: 1
      }
    },
    required: ['name', 'actions'],
    additionalProperties: false
  }
};

/**
 * API documentation schema for web search results
 */
export const API_DOCUMENTATION_SCHEMA = {
  name: 'api_documentation',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      serviceName: {
        type: 'string',
        description: 'Name of the API service'
      },
      endpoint: {
        type: 'string',
        description: 'Full API endpoint URL (must be real, not a placeholder)'
      },
      authentication: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['api_key', 'bearer', 'basic', 'none'],
            description: 'Type of authentication required'
          },
          headerName: {
            type: 'string',
            description: 'Name of the authentication header (e.g., "Authorization", "X-API-Key")'
          },
          example: {
            type: 'string',
            description: 'Example of how to format the authentication value'
          }
        },
        required: ['type']
      },
      parameters: {
        type: 'array',
        description: 'API parameters that can be sent',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Parameter name'
            },
            type: {
              type: 'string',
              description: 'Parameter type (string, number, boolean, object, array)'
            },
            required: {
              type: 'boolean',
              description: 'Whether this parameter is required'
            },
            description: {
              type: 'string',
              description: 'What this parameter does'
            }
          },
          required: ['name', 'type', 'required']
        }
      },
      examples: {
        type: 'array',
        description: 'Example API requests',
        items: {
          type: 'string'
        }
      }
    },
    required: ['serviceName', 'endpoint', 'authentication', 'parameters'],
    additionalProperties: false
  }
};

/**
 * Validation result schema
 */
export const VALIDATION_RESULT_SCHEMA = {
  name: 'validation_result',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      isValid: {
        type: 'boolean',
        description: 'Whether the shortcut passed validation'
      },
      errors: {
        type: 'array',
        description: 'List of validation errors found',
        items: {
          type: 'object',
          properties: {
            actionIndex: {
              type: 'number',
              description: 'Index of the action with the error (-1 for general errors)'
            },
            errorType: {
              type: 'string',
              enum: ['placeholder_url', 'missing_parameter', 'invalid_action', 'permission_required'],
              description: 'Type of error found'
            },
            message: {
              type: 'string',
              description: 'Human-readable error message'
            }
          },
          required: ['actionIndex', 'errorType', 'message']
        }
      },
      warnings: {
        type: 'array',
        description: 'Non-critical issues that should be reviewed',
        items: {
          type: 'string'
        }
      }
    },
    required: ['isValid', 'errors'],
    additionalProperties: false
  }
};
