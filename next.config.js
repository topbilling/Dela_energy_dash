module.exports = {
  async headers() {
    return [
      {
        // This targets the specific file directly to avoid any matching errors
        source: '/.well-known/appspecific/com.tesla.3p.public-key.pem',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/plain; charset=utf-8',
          },
          {
            key: 'Content-Disposition',
            value: 'inline',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};
