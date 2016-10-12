package org.mitre.healthit.hie2021.direct;

import java.io.InputStream;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.UriInfo;
import javax.ws.rs.Consumes;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Response;
import org.glassfish.jersey.media.multipart.FormDataParam;
import org.mitre.healthit.hie2021.dataaccess.PatientDAO;

/**
 * REST Web Service
 *
 * @author GQUINN
 */
@Path("direct")
public class SendDirectEmailService {

    @Context
    private UriInfo context;

    /**
     * Creates a new instance of SendDirectEmailService
     */
    public SendDirectEmailService() {
    }

    /**
     * Sends a Direct e-mail message containing the specified patient (by patient id)
     * in C-CDA format to the specified Direct address.
     * @param pMessage
     * @param pToAddress
     * @param pPatientId
     * @param pToCertificate
     */
    @Path("send/patient")
    @POST
    @Consumes("multipart/form-data")
    public void sendPatient(@FormDataParam("message") String pMessage, @FormDataParam("patient_id") String pPatientId, @FormDataParam("to") String pToAddress, @FormDataParam("to_cert") InputStream pToCertificate) {
        String ccda = PatientDAO.loadPatientInCcda(pPatientId);
        if (ccda == null) {
            throw new WebApplicationException(Response.Status.BAD_REQUEST);
        }
        //System.out.println(ccda);
        System.out.println("sending direct message");
        SendDirectEmail.sendEncryptedAndSignedEmailFromSyntheticMass(pMessage, ccda, pToAddress, pToCertificate);
    }
}
