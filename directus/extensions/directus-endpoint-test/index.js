export default {
	id: 'test',
	handler: (router) => {
		router.get('/', (req, res) => {
			res.send('Test endpoint works!');
		});
	}
};
