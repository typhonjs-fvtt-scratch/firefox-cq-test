import polka      from 'polka';
import sirv       from 'sirv';

const root = './public';
const port = '8080';

// Use Polka & sirv
const pServer = polka().use(sirv(root)).listen(port, (err) =>
{
   if (err) { throw err; }
   console.log(`> Ready on localhost:${port}`);
});
