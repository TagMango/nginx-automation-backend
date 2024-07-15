const express = require('express');
const bodyParser = require('body-parser');
const { promisify } = require('util');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const writeFileAsync = promisify(fs.writeFile);
const execAsync = promisify(exec);

const app = express();
const nginxConfigPath = '/Users/tagmango/nginx-automator';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/generate_nginx_config', async (req, res) => {
  const { site_name, origin_location, origin_host } = req.body;

  const nginxConfig = `
server {
    server_name ${site_name}; # Replace with your desired CDN domain

    location / {
        proxy_pass ${origin_location};
        proxy_set_header Host ${origin_host};
    }

    # Additional Nginx configuration can go here if needed
}
`;

  const fileName = `${site_name}`;
  const filePath = path.join(nginxConfigPath, fileName);

  try {
    // Use async/await with promisified fs.writeFile
    await writeFileAsync(filePath, nginxConfig);

    // Run Certbot command to obtain SSL certificate using async/await
    const certbotCommand = `sudo certbot --nginx -d ${site_name} -m webmaster@${site_name} --cert-name  ${site_name} --redirect --agree-tos --force-renewal`;
    await execAsync(certbotCommand);

    res.status(200).send(`Nginx configuration file for ${site_name} generated, saved, and SSL certificate obtained.`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to perform the necessary operations.');
  }
});
app.post('/generate_caddy_config', async (req, res) => {
  const { site_name, origin_location, origin_host } = req.body;

  const nginxConfig = 
`@app {
    host ${site_name} www.${site_name}
}
reverse_proxy @app ${origin_location} {
    header_up Host ${origin_host}
}`;

  const fileName = `${site_name}`;
  const filePath = path.join(nginxConfigPath, fileName);

  try {
    // Use async/await with promisified fs.writeFile
    await writeFileAsync(filePath, nginxConfig);
    res.status(200).send(`Nginx configuration file for ${site_name} generated, saved, and SSL certificate obtained.`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to perform the necessary operations.');
  }
});

app.listen(3000, () => {
  console.log('Express server is running on port 3000');
});
