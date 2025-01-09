module.exports = function asyncTaskRunner(task, errorMessage = 'Ошибка при выполнении фоновой задачи') {
    (async () => {
        try {
            await task();
        } catch (err) {
            console.error(`${errorMessage}:`, err);
        }
    })();
};
