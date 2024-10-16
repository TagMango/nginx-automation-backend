const express = require('express');
const bodyParser = require('body-parser');
const { promisify } = require('util');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const writeFileAsync = promisify(fs.writeFile);
const execAsync = promisify(exec);

const app = express();
const nginxConfigPath = '/home/ubuntu/enabled_sites';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/generate_nginx_config', async (req, res) => {
  const { site_name, origin_location, origin_host, no_cert_deploy } = req.body;
  let nginxConfig;
if(!no_cert_deploy){
  nginxConfig = `
server {
    server_name ${site_name}; # Replace with your desired CDN domain

    location / {
        proxy_pass ${origin_location};
        proxy_set_header Host ${origin_host};
        proxy_ssl_server_name on;
        proxy_ssl_name ${origin_host};
    }

    # Additional Nginx configuration can go here if needed
}
`;
}else{
  nginxConfig = `
  server {
      server_name ${site_name}; # Replace with your desired CDN domain
  
      location / {
          proxy_pass ${origin_location};
          proxy_set_header Host ${origin_host};
          proxy_ssl_server_name on;
          proxy_ssl_name ${origin_host};
      }
  
      # Additional Nginx configuration can go here if needed


    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/${site_name}/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/${site_name}/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
  }
  server {
  if ($host = ${site_name}) {
      return 301 https://$host$request_uri;
  } # managed by Certbot


  server_name ${site_name};
  listen 80;
  return 404; # managed by Certbot

}`;
}
  const fileName = `${site_name}`;
  const filePath = path.join(nginxConfigPath, fileName);

  try {
    // Use async/await with promisified fs.writeFile
    await writeFileAsync(filePath, nginxConfig);

    // Run Certbot command to obtain SSL certificate using async/await
if (!no_cert_deploy) {
    const certbotCommand = `sudo certbot --nginx -d ${site_name} -m webmaster@${site_name} --cert-name  ${site_name} --redirect --agree-tos --force-renewal`;
    await execAsync(certbotCommand);
}
    res.status(200).send(`Nginx configuration file for ${site_name} generated, saved, and SSL certificate obtained.`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to perform the necessary operations.');
  }
});

app.listen(3000, () => {
  console.log('Express server is running on port 3000');
});