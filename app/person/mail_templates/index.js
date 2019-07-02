const templates = {
  en: {
    subject: `{{template_system_name}} Password reset`,
    body: `
    Dear {{template_user_name}}（{{template_user_email}}）

    I have applied for a password change procedure.
    Please access the following URL and continue.
    
    {{template_URL}}
    
    If you do not change your password, please ignore this email.
    Your password will not change unless you access the link and complete the procedure.
    
    This URL is valid until {{template_valid_date}}.
    After the expiration date, please change again.
    
    For inquiries, please contact the person in charge designated by the administrator.
    
    # This e-mail is sent from [×] to {{template_user_email}}.
    # This email has been sent automatically by the system.
    # Please note that we can not respond even if you reply to this email.`
  },
  jp: {
    subject: `{{template_system_name}} パスワードの再設定について`,
    body: `
    {{template_user_name}} （{{template_user_email}}）様

    パスワード変更手続きのお申込みがありました。
    下記のURLへアクセスして、手続きを続行してください。

    {{template_URL}}

    パスワード変更手続きにお心当たりのない場合は、このメールを無視してください。
    リンクにアクセスして手続きを完了させない限り、パスワードが変更されることはありません。

    なお、本URLは {{template_valid_date}} まで有効です。
    有効期限経過後は、再度変更手続きを行ってください。

    お問い合わせにつきましては、管理者より指定されている窓口までご連絡ください。

    # 本メールは[×]より {{template_user_email}} 様宛にお送りしています。
    # 本メールはシステムより自動送信されています。
    # 本メールに返信されましても、返答できませんのでご了承ください。
    `
  }
}

const letter = function(lang = 'en', replace_data) {
  
  const {
    system_name = 'Video-CMS',
    name = 'UserName',
    email,
    valid,
    url
  } = replace_data

console.log(system_name, name, email, valid, url)

  const subject = templates[lang].subject.replace(
    /{{template_system_name}}/g,
    system_name
  )
  const body = templates[lang].body
    .replace(/{{template_user_name}}/g, name)
    .replace(/{{template_user_email}}/g, email)
    .replace(/{{template_URL}}/g, url)
    .replace(/{{template_valid_date}}/g, valid)
    
  return {subject, body}
}
module.exports = letter
