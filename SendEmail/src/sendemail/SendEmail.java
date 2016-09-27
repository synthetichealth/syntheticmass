package sendemail;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.Date;
import java.util.Enumeration;
import java.util.List;
import java.util.Properties;
import javax.mail.Authenticator;
import javax.mail.Message;
import javax.mail.PasswordAuthentication;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeBodyPart;
import javax.mail.internet.MimeMessage;
import javax.mail.internet.MimeMultipart;
import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.NameValuePair;
import org.apache.http.client.HttpClient;
import org.apache.http.client.entity.UrlEncodedFormEntity;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.mime.MultipartEntityBuilder;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.message.BasicNameValuePair;
import org.bouncycastle.asn1.ASN1EncodableVector;
import org.bouncycastle.asn1.cms.AttributeTable;
import org.bouncycastle.asn1.cms.IssuerAndSerialNumber;
import org.bouncycastle.asn1.smime.SMIMECapabilitiesAttribute;
import org.bouncycastle.asn1.smime.SMIMECapability;
import org.bouncycastle.asn1.smime.SMIMECapabilityVector;
import org.bouncycastle.asn1.smime.SMIMEEncryptionKeyPreferenceAttribute;
import org.bouncycastle.asn1.x500.X500Name;
import org.bouncycastle.cert.jcajce.JcaCertStore;
import org.bouncycastle.cms.CMSAlgorithm;
import org.bouncycastle.cms.jcajce.JcaSimpleSignerInfoGeneratorBuilder;
import org.bouncycastle.cms.jcajce.JceCMSContentEncryptorBuilder;
import org.bouncycastle.cms.jcajce.JceKeyTransRecipientInfoGenerator;
import org.bouncycastle.mail.smime.SMIMEEnvelopedGenerator;
import org.bouncycastle.mail.smime.SMIMESignedGenerator;
import org.bouncycastle.util.Store;
import org.bouncycastle.util.Strings;
import org.bouncycastle.util.encoders.Base64;

/**
 *
 * @author GQUINN
 */
public class SendEmail {

    /**
     * @param args the command line arguments
     */
    public static void main(String[] args) {
        sendViaRestService();
        //sendViaJavamail();
    }
    
    public static void sendViaJavamail() {
        System.out.println("SendEmail Start");
        String smtpHostServer = "syntheticmass-dev.mitre.org";
        String fromUser = "gquinn";
        String fromName = "Greg Quinn";
        String fromEmail = "gquinn@direct.syntheticmass.mitre.org";
        String password = "gquinn";
        String toEmail = "gquinn@direct.syntheticmass.mitre.org";

//        if (Security.getProvider("BC") == null) {
//            Security.addProvider(new BouncyCastleProvider());
//        }

        Properties props = System.getProperties();
        props.put("mail.smtp.host", smtpHostServer);
        //props.put("mail.smtp.auth", "true");
        //props.put("mail.smtp.port", "587");
        //props.put("mail.smtp.starttls.enable", "true");

        Authenticator auth;
        if (true) {
            auth = new Authenticator() {
                //override the getPasswordAuthentication method
                @Override
                protected PasswordAuthentication getPasswordAuthentication() {
                    return new PasswordAuthentication(Base64.toBase64String(fromEmail.getBytes()), Base64.toBase64String(password.getBytes())); //Base64.encode(DigestUtils.sha1(password))
                }
            };
        } else {
            auth = null;
        }

        Session session = Session.getInstance(props, auth);
        //sendEmailOld(session, fromEmail, fromName, toEmail, "SendEmail Direct Testing Subject", "SimpleEmail Testing Body", true);
        
        sendEncryptedAndSignedEmail(session, fromEmail, fromName, toEmail, "SendEmail Direct Testing Subject", "SimpleEmail Testing Body");
    }

    //private static final String LOCAL_REST_ENDPOINT = "http://localhost:8084/SendDirectEmailService/webresources/direct/send/patient";
    private static final String SYNTHETICMASS_DEV_REST_ENDPOINT = "http://syntheticmass-dev.mitre.org:8081/SendDirectEmailService/webresources/direct/send/patient";
    
    public static void sendViaRestService() {
        try {
            HttpClient httpclient = HttpClients.createDefault();
            HttpPost httppost = new HttpPost(SYNTHETICMASS_DEV_REST_ENDPOINT);

            if (false) {
        // Request parameters and other properties.
                List<NameValuePair> params = new ArrayList<NameValuePair>(2);
                params.add(new BasicNameValuePair("patient_id", "00ab647b-9f62-4a14-aedb-fe8872a44a47"));
                params.add(new BasicNameValuePair("message", "patient x"));
                params.add(new BasicNameValuePair("to", "gquinn@direct.syntheticmass.mitre.org"));
                HttpEntity entity = new UrlEncodedFormEntity(params, "UTF-8");
                httppost.setEntity(entity);
            } else {
                HttpEntity entity = MultipartEntityBuilder
                        .create()
                        .addTextBody("patient_id", "00ab647b-9f62-4a14-aedb-fe8872a44a47")
                        .addTextBody("message", "patient y")
                        .addTextBody("to", "gquinn@direct.syntheticmass.mitre.org")
                        .addBinaryBody("to_cert", new File(CERT_FILE), ContentType.create("application/octet-stream"), "org.der")
                        .build();
                httppost.setEntity(entity);
            }

    //Execute and get the response.
            HttpResponse response = httpclient.execute(httppost);
            HttpEntity entity = response.getEntity();

            if (entity != null) {
                InputStream instream = entity.getContent();
                try {
                    // do something useful
                } finally {
                    instream.close();
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void sendEncryptedAndSignedEmail(Session session, String fromEmail, String fromName, String toEmail, String subject, String body) {

        MimeMessage baseMessage = createMessage(session, fromEmail, fromName, toEmail, subject, body);

        loadCrypto();
        MimeMessage signedMessage = signMessage(session, baseMessage);
        MimeMessage encryptedMessage = encryptMessage(session, signedMessage);
        System.out.println("Message is ready");
        try {
            Transport.send(encryptedMessage);
            System.out.println("EMail Sent Successfully!!");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static final String CERT_FILE = "C:\\Users\\gquinn\\Desktop\\direct_certs\\org.der";
    private static final String KEY_STORE = "C:\\Users\\gquinn\\Desktop\\direct_certs\\org.p12";
    private static final String KEY_STORE_PASSWORD = "Password_1";
    private static Certificate[] cChain;
    private static PrivateKey cPrivateKey;

    private static void loadCrypto() {
        /* Add BC */
        //Security.addProvider(new BouncyCastleProvider());

        /* Open the keystore */
        try {
            KeyStore keystore = KeyStore.getInstance("PKCS12", "BC");
            keystore.load(new FileInputStream(KEY_STORE), KEY_STORE_PASSWORD.toCharArray());

            Enumeration e = keystore.aliases();
            String keyAlias = null;
            while (e.hasMoreElements()) {
                String alias = (String) e.nextElement();

                if (keystore.isKeyEntry(alias)) {
                    keyAlias = alias;
                }
            }

            if (keyAlias != null) {
                /* Get the private key to sign the message with */
                cChain = keystore.getCertificateChain(keyAlias);
                cPrivateKey = (PrivateKey) keystore.getKey(keyAlias,
                        KEY_STORE_PASSWORD.toCharArray());
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        if (cChain == null) {
            throw new RuntimeException("Unable to find certificate chain.");
        }
        if (cPrivateKey == null) {
            throw new RuntimeException("cannot find private key.");
        }
    }

    private static MimeMessage signMessage(Session session, MimeMessage pMessage) {
        try {
            /* Create the SMIMESignedGenerator */
            SMIMECapabilityVector capabilities = new SMIMECapabilityVector();
            capabilities.addCapability(SMIMECapability.dES_EDE3_CBC);
            capabilities.addCapability(SMIMECapability.rC2_CBC, 128);
            capabilities.addCapability(SMIMECapability.dES_CBC);

            ASN1EncodableVector attributes = new ASN1EncodableVector();
            attributes.add(new SMIMEEncryptionKeyPreferenceAttribute(
                    new IssuerAndSerialNumber(
                            new X500Name(((X509Certificate) cChain[0])
                                    .getIssuerDN().getName()),
                            ((X509Certificate) cChain[0]).getSerialNumber())));
            attributes.add(new SMIMECapabilitiesAttribute(capabilities));

            SMIMESignedGenerator signer = new SMIMESignedGenerator();
            signer.addSignerInfoGenerator(
                    new JcaSimpleSignerInfoGeneratorBuilder().setProvider("BC").setSignedAttributeGenerator(new AttributeTable(attributes))
                    .build("DSA".equals(cPrivateKey.getAlgorithm()) ? "SHA1withDSA" : "MD5withRSA", cPrivateKey, (X509Certificate) cChain[0]));

            /* Add the list of certs to the generator */
            List certList = new ArrayList();
            certList.add(cChain[0]);
            Store certs = new JcaCertStore(certList);
            signer.addCertificates(certs);

            /* Sign the message */
            MimeMultipart mm = signer.generate(pMessage);
            MimeMessage signedMessage = new MimeMessage(session);

            /* Set all original MIME headers in the signed message */
            Enumeration headers = pMessage.getAllHeaderLines();
            while (headers.hasMoreElements()) {
                signedMessage.addHeaderLine((String) headers.nextElement());
            }

            /* Set the content of the signed message */
            signedMessage.setContent(mm);
            signedMessage.saveChanges();
            return signedMessage;
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    private static MimeMessage encryptMessage(Session session, MimeMessage pMessage) {
        try {
            /* Create the encrypter */
            SMIMEEnvelopedGenerator encrypter = new SMIMEEnvelopedGenerator();
            encrypter.addRecipientInfoGenerator(new JceKeyTransRecipientInfoGenerator((X509Certificate) cChain[0]).setProvider("BC"));

            /* Encrypt the message */
            MimeBodyPart encryptedPart = encrypter.generate(pMessage,
                    new JceCMSContentEncryptorBuilder(CMSAlgorithm.RC2_CBC).setProvider("BC").build());

            /*
             * Create a new MimeMessage that contains the encrypted and signed
             * content
             */
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            encryptedPart.writeTo(out);

            MimeMessage encryptedMessage = new MimeMessage(session,
                    new ByteArrayInputStream(out.toByteArray()));

            /* Set all original MIME headers in the encrypted message */
            Enumeration headers = pMessage.getAllHeaderLines();
            while (headers.hasMoreElements()) {
                String headerLine = (String) headers.nextElement();
                /*
                 * Make sure not to override any content-* headers from the
                 * original message
                 */
                if (!Strings.toLowerCase(headerLine).startsWith("content-")) {
                    encryptedMessage.addHeaderLine(headerLine);
                }
            }
            return encryptedMessage;
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    public static MimeMessage createMessage(Session session, String fromEmail, String fromName, String toEmail, String subject, String body) {
        try {
            MimeMessage msg = new MimeMessage(session);
            msg.addHeader("Content-type", "text/HTML; charset=UTF-8");
            msg.addHeader("format", "flowed");
            msg.addHeader("Content-Transfer-Encoding", "8bit");
            msg.setFrom(new InternetAddress(fromEmail, fromName));
            msg.setReplyTo(InternetAddress.parse(fromEmail, false));

            msg.setSentDate(new Date());
            msg.setRecipients(Message.RecipientType.TO, InternetAddress.parse(toEmail, false));
            msg.setSubject(subject, "UTF-8");
            msg.setText(body, "UTF-8");
            msg.saveChanges();

            return msg;
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    /**
     * original sendEmail with encryptMessage public static void
     * sendEmail(Session session, String fromEmail, String fromName, String
     * toEmail, String subject, String body, boolean pEncrypt) { try {
     * MimeMessage msg = new MimeMessage(session); msg.addHeader("Content-type",
     * "text/HTML; charset=UTF-8"); msg.addHeader("format", "flowed");
     * msg.addHeader("Content-Transfer-Encoding", "8bit"); msg.setFrom(new
     * InternetAddress(fromEmail, fromName));
     * msg.setReplyTo(InternetAddress.parse(fromEmail, false));
     * //msg.setSubject(subject, "UTF-8"); //msg.setText(body, "UTF-8");
     *
     * msg.setSentDate(new Date()); msg.setRecipients(Message.RecipientType.TO,
     * InternetAddress.parse(toEmail, false)); if (pEncrypt) encryptMessage(msg,
     * subject, body); System.out.println("Message is ready");
     * Transport.send(msg); System.out.println("EMail Sent Successfully!!"); }
     * catch (Exception e) { e.printStackTrace(); } }
     *
     * private static void encryptMessage(MimeMessage pMessage, String pSubject,
     * String pContent) { // // Open the key store // try { KeyStore ks =
     * KeyStore.getInstance("PKCS12", "BC"); ks.load(new
     * FileInputStream(KEY_STORE), KEY_STORE_PASSWORD.toCharArray());
     *
     * Enumeration e = ks.aliases(); String keyAlias = null;
     *
     * while (e.hasMoreElements()) { String alias = (String)e.nextElement();
     *
     * if (ks.isKeyEntry(alias)) { keyAlias = alias; } }
     *
     * if (keyAlias == null) { System.err.println("can't find a private key!");
     * System.exit(0); }
     *
     * Certificate[] chain = ks.getCertificateChain(keyAlias);
     *
     * // // create the generator for creating an smime/encrypted message //
     * SMIMEEnvelopedGenerator gen = new SMIMEEnvelopedGenerator();
     *
     * gen.addRecipientInfoGenerator(new
     * JceKeyTransRecipientInfoGenerator((X509Certificate)chain[0]).setProvider("BC"));
     *
     * // // create the base for our message // MimeBodyPart msg = new
     * MimeBodyPart();
     *
     * msg.setText(pContent);
     *
     * MimeBodyPart mp = gen.generate(msg, new
     * JceCMSContentEncryptorBuilder(CMSAlgorithm.RC2_CBC).setProvider("BC").build());
     * // // Get a Session object and create the mail message // //Properties
     * props = System.getProperties(); //Session session =
     * Session.getDefaultInstance(props, null);
     *
     * //Address fromUser = new InternetAddress("\"Eric H.
     * Echidna\"<eric@bouncycastle.org>"); //Address toUser = new
     * InternetAddress("example@bouncycastle.org");
     *
     * //MimeMessage body = new MimeMessage(session); //body.setFrom(fromUser);
     * //body.setRecipient(Message.RecipientType.TO, toUser);
     * pMessage.setSubject(pSubject); pMessage.setContent(mp.getContent(),
     * mp.getContentType()); pMessage.saveChanges(); } catch (Exception e) {
     * e.printStackTrace();
    }
     */
}
