exports.handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse the request body
    const data = JSON.parse(event.body);
    const { thoughts, email, name, appVersion, location } = data;

    // Basic validation
    if (!thoughts || thoughts.trim() === '') {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Thoughts are required' })
      };
    }

    // Log the thoughts (you can replace this with your preferred storage method)
    console.log('Received thoughts from LUPO app:', {
      thoughts: thoughts,
      email: email || 'No email provided',
      name: name || 'Anonymous',
      appVersion: appVersion || 'Unknown version',
      location: location || 'Location not available',
      timestamp: new Date().toISOString(),
      ip: event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown',
      userAgent: event.headers['user-agent'] || 'Unknown'
    });

    // Here you can add your preferred storage method:
    // - Save to a database
    // - Send an email notification
    // - Store in a file
    // - Send to a webhook
    // - etc.

    // For now, we'll just return a success response
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true, 
        message: 'Thoughts received successfully!',
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error processing thoughts:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: 'Failed to process thoughts'
      })
    };
  }
};
