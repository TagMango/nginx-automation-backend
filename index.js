const express = require('express');
const bodyParser = require('body-parser');
const { promisify } = require('util');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const writeFileAsync = promisify(fs.writeFile);
const execAsync = promisify(exec);

const app = express();
const nginxConfigPath = '/etc/nginx/sites-available';

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
    const certbotCommand = `sudo certbot certonly --nginx -d ${site_name} --email webmaster@${site_name} --agree-tos`;
    await execAsync(certbotCommand);

    res.status(200).send(`Nginx configuration file for ${site_name} generated, saved, and SSL certificate obtained.`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to perform the necessary operations.');
  }
});

app.listen(3000, () => {
  console.log('Express server is running on port 3000');
});
