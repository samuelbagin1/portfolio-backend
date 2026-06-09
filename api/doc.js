const errorResponse = {
  description: 'Error response',
  content: {
    'application/json': {
      schema: {
        $ref: '#/components/schemas/Error'
      }
    }
  }
};

const unauthorizedResponse = {
  description: 'Missing, malformed, expired, or invalid JWT',
  content: {
    'application/json': {
      schema: {
        $ref: '#/components/schemas/Error'
      },
      example: {
        error: 'Unauthorized'
      }
    }
  }
};

const forbiddenResponse = {
  description: 'Valid JWT without the admin role',
  content: {
    'application/json': {
      schema: {
        $ref: '#/components/schemas/Error'
      },
      example: {
        error: 'Forbidden'
      }
    }
  }
};

const adminSecurity = [{ bearerAuth: [] }];

const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Portfolio Backend API',
    version: '1.0.0',
    description: 'Public portfolio content API. Creating and deleting content requires an admin JWT.'
  },
  servers: [
    {
      url: '/',
      description: 'Current deployment'
    }
  ],
  tags: [
    { name: 'Health' },
    { name: 'Authentication' },
    { name: 'Photos' },
    { name: 'Graphics' },
    { name: 'Develop' },
    { name: 'Videos' }
  ],
  paths: {
    '/': {
      get: {
        tags: ['Health'],
        summary: 'Check service health',
        responses: {
          200: {
            description: 'Service is available',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['message'],
                  properties: {
                    message: {
                      type: 'string',
                      example: 'Service is up!'
                    }
                  }
                }
              }
            }
          },
          500: errorResponse
        }
      }
    },
    '/api/auth': {
      post: {
        tags: ['Authentication'],
        summary: 'Sign in as the administrator',
        description: 'Returns an admin JWT that expires after one hour.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/LoginRequest'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Authentication successful',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LoginResponse'
                }
              }
            }
          },
          401: {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                },
                example: {
                  error: 'Invalid credentials'
                }
              }
            }
          },
          500: errorResponse
        }
      }
    },
    '/api/photo': {
      get: {
        tags: ['Photos'],
        summary: 'List photos',
        responses: {
          200: {
            description: 'All photos',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Photo'
                  }
                }
              }
            }
          },
          500: errorResponse
        }
      },
      post: {
        tags: ['Photos'],
        summary: 'Upload a photo',
        security: adminSecurity,
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['photo', 'text'],
                properties: {
                  photo: {
                    type: 'string',
                    format: 'binary'
                  },
                  text: {
                    type: 'string'
                  }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Photo created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Photo'
                }
              }
            }
          },
          400: errorResponse,
          401: unauthorizedResponse,
          403: forbiddenResponse,
          500: errorResponse
        }
      },
      delete: {
        tags: ['Photos'],
        summary: 'Delete a photo',
        security: adminSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CloudinaryDeleteRequest'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Photo deleted',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CloudinaryDeleteResponse'
                }
              }
            }
          },
          400: errorResponse,
          401: unauthorizedResponse,
          403: forbiddenResponse,
          404: errorResponse,
          500: errorResponse
        }
      }
    },
    '/api/graphic': {
      get: {
        tags: ['Graphics'],
        summary: 'List graphic items',
        responses: {
          200: {
            description: 'All graphic items',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Graphic'
                  }
                }
              }
            }
          },
          500: errorResponse
        }
      },
      post: {
        tags: ['Graphics'],
        summary: 'Create a graphic item',
        security: adminSecurity,
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['image'],
                properties: {
                  image: {
                    type: 'string',
                    format: 'binary'
                  }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Graphic item created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Graphic'
                }
              }
            }
          },
          400: errorResponse,
          401: unauthorizedResponse,
          403: forbiddenResponse,
          500: errorResponse
        }
      },
      delete: {
        tags: ['Graphics'],
        summary: 'Delete a graphic item',
        security: adminSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CloudinaryDeleteRequest'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Graphic item deleted',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CloudinaryDeleteResponse'
                }
              }
            }
          },
          400: errorResponse,
          401: unauthorizedResponse,
          403: forbiddenResponse,
          404: errorResponse,
          500: errorResponse
        }
      }
    },
    '/api/develop': {
      get: {
        tags: ['Develop'],
        summary: 'List development projects',
        responses: {
          200: {
            description: 'All development projects',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Develop'
                  }
                }
              }
            }
          },
          500: errorResponse
        }
      },
      post: {
        tags: ['Develop'],
        summary: 'Create a development project',
        security: adminSecurity,
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['title', 'text', 'linkText', 'image'],
                properties: {
                  title: {
                    type: 'string'
                  },
                  text: {
                    type: 'string'
                  },
                  linkText: {
                    type: 'string'
                  },
                  image: {
                    type: 'string',
                    format: 'binary'
                  }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Development project created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Develop'
                }
              }
            }
          },
          400: errorResponse,
          401: unauthorizedResponse,
          403: forbiddenResponse,
          500: errorResponse
        }
      },
      delete: {
        tags: ['Develop'],
        summary: 'Delete a development project',
        security: adminSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CloudinaryDeleteRequest'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Development project deleted',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CloudinaryDeleteResponse'
                }
              }
            }
          },
          400: errorResponse,
          401: unauthorizedResponse,
          403: forbiddenResponse,
          404: errorResponse,
          500: errorResponse
        }
      }
    },
    '/api/video': {
      get: {
        tags: ['Videos'],
        summary: 'List videos',
        responses: {
          200: {
            description: 'All videos',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Video'
                  }
                }
              }
            }
          },
          500: errorResponse
        }
      },
      post: {
        tags: ['Videos'],
        summary: 'Create a video',
        security: adminSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['linkText'],
                properties: {
                  linkText: {
                    type: 'string'
                  }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Video created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Video'
                }
              }
            }
          },
          400: errorResponse,
          401: unauthorizedResponse,
          403: forbiddenResponse,
          500: errorResponse
        }
      },
      delete: {
        tags: ['Videos'],
        summary: 'Delete a video',
        security: adminSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/DeleteByIdRequest'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Video deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'message'],
                  properties: {
                    success: {
                      type: 'boolean',
                      example: true
                    },
                    message: {
                      type: 'string',
                      example: 'Video item deleted successfully'
                    }
                  }
                }
              }
            }
          },
          400: errorResponse,
          401: unauthorizedResponse,
          403: forbiddenResponse,
          404: errorResponse,
          500: errorResponse
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT returned by POST /api/auth'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'string'
          },
          details: {
            type: 'string'
          }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: {
            type: 'string',
            example: 'admin'
          },
          password: {
            type: 'string',
            format: 'password'
          }
        }
      },
      LoginResponse: {
        type: 'object',
        required: ['token', 'expiresIn'],
        properties: {
          token: {
            type: 'string',
            description: 'Admin JWT'
          },
          expiresIn: {
            type: 'integer',
            example: 3600,
            description: 'Token lifetime in seconds'
          }
        }
      },
      MongoId: {
        type: 'string',
        pattern: '^[a-fA-F0-9]{24}$',
        example: '507f1f77bcf86cd799439011'
      },
      Photo: {
        type: 'object',
        required: ['_id', 'text', 'photo', 'publicId', 'createdAt'],
        properties: {
          _id: {
            $ref: '#/components/schemas/MongoId'
          },
          text: {
            type: 'string'
          },
          photo: {
            type: 'string',
            format: 'uri'
          },
          publicId: {
            type: 'string'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      Graphic: {
        type: 'object',
        required: ['_id', 'image', 'publicId', 'createdAt'],
        properties: {
          _id: {
            $ref: '#/components/schemas/MongoId'
          },
          image: {
            type: 'string',
            format: 'uri'
          },
          publicId: {
            type: 'string'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      Develop: {
        type: 'object',
        required: ['_id', 'title', 'text', 'linkText', 'image', 'publicId', 'createdAt'],
        properties: {
          _id: {
            $ref: '#/components/schemas/MongoId'
          },
          title: {
            type: 'string'
          },
          text: {
            type: 'string'
          },
          linkText: {
            type: 'string'
          },
          image: {
            type: 'string',
            format: 'uri'
          },
          publicId: {
            type: 'string'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      Video: {
        type: 'object',
        required: ['_id', 'linkText', 'createdAt'],
        properties: {
          _id: {
            $ref: '#/components/schemas/MongoId'
          },
          linkText: {
            type: 'string'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      DeleteByIdRequest: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            $ref: '#/components/schemas/MongoId'
          }
        }
      },
      CloudinaryDeleteRequest: {
        type: 'object',
        required: ['id', 'publicId'],
        properties: {
          id: {
            $ref: '#/components/schemas/MongoId'
          },
          publicId: {
            type: 'string'
          }
        }
      },
      CloudinaryDeleteResponse: {
        type: 'object',
        required: ['success', 'cloudinary'],
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          cloudinary: {
            type: 'object',
            additionalProperties: true
          }
        }
      }
    }
  }
};

function createSwaggerPage() {
  const serializedDocument = JSON.stringify(openApiDocument).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Portfolio Backend API Documentation</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        SwaggerUIBundle({
          spec: ${serializedDocument},
          dom_id: '#swagger-ui',
          deepLinking: true,
          persistAuthorization: true,
          displayRequestDuration: true,
          tryItOutEnabled: true
        });
      };
    </script>
  </body>
</html>`;
}

export default function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.status(200).send(createSwaggerPage());
}

export { openApiDocument };
