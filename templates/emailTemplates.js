function getRegistrationEmailTemplate(code) {
    return `
        <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05); overflow: hidden;">
                
                <div style="background-color: #4CAF50; padding: 20px; text-align: center;">
                    <h1 style="color: #fff; font-size: 24px; margin: 0;">Добро пожаловать в TalkMap!</h1>
                </div>

                <div style="padding: 20px;">
                    <h2 style="color: #4CAF50; font-size: 22px; margin-bottom: 20px;">Ваш код подтверждения</h2>
                    <p style="font-size: 16px; color: #555;">
                        Приветствуем! Спасибо за регистрацию в социальной сети <strong>TalkMap</strong>. Мы рады видеть вас в нашем сообществе!
                    </p>
                    <p style="font-size: 16px; color: #555;">
                        Ваш код для подтверждения регистрации:
                    </p>

                    <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 30px; font-weight: bold; color: #4CAF50; border-radius: 8px; letter-spacing: 2px;">
                        ${code}
                    </div>

                    <p style="font-size: 16px; color: #555; margin-top: 20px;">
                        Введите этот код в приложении, чтобы продолжить регистрацию. 
                    </p>
                    
                    <p style="font-size: 16px; color: #555; margin-top: 20px;">
                        Если вы не запрашивали этот код, просто проигнорируйте это письмо.
                    </p>
                </div>

                <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; color: #888;">
                    © 2024 TalkMap. Все права защищены.
                </div>
            </div>
        </div>
    `;
}

function getRecoveryEmailTemplate(code) {
    return `
        <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05); overflow: hidden;">
                
                <div style="background-color: #FF5722; padding: 20px; text-align: center;">
                    <h1 style="color: #fff; font-size: 24px; margin: 0;">Восстановление пароля в TalkMap</h1>
                </div>

                <div style="padding: 20px;">
                    <h2 style="color: #FF5722; font-size: 22px; margin-bottom: 20px;">Ваш код для восстановления пароля</h2>
                    <p style="font-size: 16px; color: #555;">
                        Мы получили запрос на восстановление пароля для вашего аккаунта в <strong>TalkMap</strong>.
                    </p>
                    <p style="font-size: 16px; color: #555;">
                        Ваш код для восстановления пароля:
                    </p>

                    <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 30px; font-weight: bold; color: #FF5722; border-radius: 8px; letter-spacing: 2px;">
                        ${code}
                    </div>

                    <p style="font-size: 16px; color: #555; margin-top: 20px;">
                        Введите этот код в приложении, чтобы восстановить свой пароль.
                    </p>
                    
                    <p style="font-size: 16px; color: #555; margin-top: 20px;">
                        Если вы не запрашивали восстановление пароля, пожалуйста, проигнорируйте это письмо.
                    </p>
                </div>

                <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; color: #888;">
                    © 2024 TalkMap. Все права защищены.
                </div>
            </div>
        </div>
    `;
}

module.exports = { getRegistrationEmailTemplate, getRecoveryEmailTemplate };