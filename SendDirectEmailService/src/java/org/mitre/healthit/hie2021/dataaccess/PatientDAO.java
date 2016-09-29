package org.mitre.healthit.hie2021.dataaccess;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;

/**
 *
 * @author GQUINN
 */
public class PatientDAO {

    public static String loadPatientInCcda(String pPatientId) {
        try {
            return readFile(new File("/ccda/" + pPatientId + ".xml"));
        } catch (IOException e) {
            e.printStackTrace();
            return null;
        }
    }

    private static String readFile(File pFile) throws IOException {
        BufferedReader br = new BufferedReader(new FileReader(pFile));
        try {
            StringBuilder sb = new StringBuilder();
            String line = br.readLine();

            while (line != null) {
                sb.append(line);
                sb.append("\n");
                line = br.readLine();
            }
            return sb.toString();
        } finally {
            br.close();
        }
    }
}
