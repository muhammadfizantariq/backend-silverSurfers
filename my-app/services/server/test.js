import axios from 'axios';

async function sendNewJob() {
  const serverUrl = 'http://localhost:3000/start-audit';
  
  const newJob = {
    email: 'client-job-1@example.com',
    url: 'http://books.toscrape.com/'
  };

  console.log(`Sending job for ${newJob.email} to the server...`);

  try {
    const response = await axios.post(serverUrl, newJob);
    console.log('✅ Server responded successfully!');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('🔴 Error sending job:', error.message);
  }
}

sendNewJob();