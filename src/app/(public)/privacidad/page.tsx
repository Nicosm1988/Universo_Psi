import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { CookiePreferencesButton } from "@/components/consent/cookie-preferences-button";
import { LEGAL_CONTACT_EMAIL, LEGAL_ENTITY, PRIVACY_VERSION_LABEL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Cómo Universo Psi recopila, almacena, procesa, utiliza y protege los datos personales, conforme a la Ley N° 25.326.",
  alternates: { canonical: "/privacidad" },
};

const sectionClassName = "space-y-3";
const headingClassName = "text-lg font-semibold tracking-[-0.01em] text-ink sm:text-xl";
const subheadingClassName = "text-base font-semibold text-ink";
const listClassName = "list-disc space-y-3 pl-5 marker:text-senda";

export default function PrivacyPage() {
  return (
    <section className="bg-paper py-12 sm:py-16">
      <Container className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-senda">{PRIVACY_VERSION_LABEL}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-4xl">
          Política de privacidad y tratamiento de datos personales
        </h1>

        <div className="mt-9 space-y-9 text-[0.9375rem] leading-7 text-muted">
          <section className={sectionClassName}>
            <p>
              La presente Política de Privacidad (en adelante, la “Política”) regula el modo en que Universo Psi
              recopila, almacena, procesa, utiliza y protege los datos personales facilitados por los Sujetos
              Alcanzados en el sitio web universopsi.com.ar (en adelante, el “Sitio Web”).
            </p>
            <p>
              El Sitio Web es de titularidad de {LEGAL_ENTITY.name}, CUIT {LEGAL_ENTITY.taxId}, con domicilio en{" "}
              {LEGAL_ENTITY.address}, quien reviste el carácter de responsable de la base de datos a los efectos
              de la Ley N° 25.326.
            </p>
            <p>
              Cualquier Sujeto Alcanzado podrá consultar este documento en todo momento. De surgir dudas,
              preguntas o requerimientos acerca del tratamiento de su información, podrá ponerse en contacto con
              Universo Psi a través del{" "}
              <Link className="font-semibold text-ink underline underline-offset-4" href="/contacto">
                formulario oficial disponible en la sección de “Contacto”
              </Link>{" "}
              de la plataforma. Para ejercer sus derechos de acceso, rectificación, actualización o supresión, o
              para pedir la baja, use el{" "}
              <Link className="font-semibold text-ink underline underline-offset-4" href="/solicitudes">
                formulario de baja, arrepentimiento y privacidad
              </Link>
              , que deja constancia del pedido.
            </p>
            <p>
              Universo Psi se compromete firmemente a proteger la privacidad de los datos suministrados por los
              Sujetos Alcanzados, procurando ofrecer una experiencia en línea segura y con plenas garantías. El
              objetivo de esta Política es informar con absoluta transparencia cómo se tratarán los datos
              personales facilitados en el Sitio Web, sin que la misma resulte aplicable a información que sea de
              carácter público o que se hubiere obtenido por otros medios legítimos fuera de la plataforma.
            </p>
            <p>
              Esta Política rige y es de cumplimiento obligatorio tanto para los Profesionales de la Salud Mental
              y similares (personas humanas o jurídicas) que ofrezcan sus servicios, como para los Visitantes y
              Usuarios que naveguen por el Sitio Web o interactúen con dichos profesionales.
            </p>
            <p>
              Universo Psi cumple estrictamente con la normativa de protección de datos personales vigente en la
              República Argentina (Ley N° 25.326, su Decreto Reglamentario N° 1558/2001 y normas concordantes).
              Esta legislación regula el tratamiento de su información y le concede diversos derechos
              irrenunciables (acceso, rectificación, actualización y supresión de datos).
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>Enlaces a sitios web de terceros</h2>
            <p>
              El Sitio Web contiene enlaces, hipervínculos o conexiones hacia sitios web externos sobre los cuales
              Universo Psi no ejerce ningún tipo de control operativo, técnico ni legal. En consecuencia, Universo
              Psi no será responsable por las políticas, términos de uso o prácticas de privacidad de dichos
              sitios ajenos. Se recomienda a los Sujetos Alcanzados revisar de forma independiente las políticas
              de privacidad de cada sitio web externo al que decidan ingresar, para conocer cómo recogen, utilizan
              y comparten su información. La presente Política se aplica de manera exclusiva a los datos
              capturados directamente por Universo Psi dentro de este Sitio Web.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>1. Obtención, categorías y retención de la información</h2>
            <p>
              <strong className="font-semibold text-ink">Visitantes y Usuarios en general.</strong> La navegación
              general y la búsqueda de especialistas en el catálogo profesional del Sitio Web son de carácter
              libre y no requieren que Usted suministre datos personales. No obstante, si decide contactar a un
              profesional a través de las herramientas de la plataforma, se le solicitará de forma obligatoria su
              nombre completo (Nombre y Apellido) y una dirección de correo electrónico válida, con el único fin
              de identificar su solicitud y remitirle la información de contacto requerida a su casilla de correo.
            </p>
            <p>
              <strong className="font-semibold text-ink">Profesionales de la Salud Mental y similares.</strong>{" "}
              Para registrarse en la plataforma y publicar sus servicios en el catálogo del Sitio Web, Universo
              Psi requerirá de forma obligatoria que facilite datos personales y profesionales veraces,
              incluyendo: nombre completo, dirección comercial o de consultorio, dirección de correo electrónico,
              número de teléfono, especialidad y datos de contacto profesional de los que se pueda deducir su
              identidad. Universo Psi no solicitará en ningún caso datos financieros ni información directa de
              facturación (como números de tarjetas de crédito o débito) en sus propios servidores, derivando
              dicha gestión a plataformas de pago externas (Mercado Pago).
            </p>
            <p>
              <strong className="font-semibold text-ink">Información demográfica y técnica.</strong> Universo Psi
              recoge o puede recoger información demográfica general que no es exclusiva de su identidad, tal como
              código postal, edad, género, profesión y especialidad, con fines estrictamente estadísticos o de
              optimización del buscador. Asimismo, se recopila de manera automática información técnica sobre el
              uso que hace del Sitio Web, incluyendo la dirección IP, tipo de navegador utilizado, nombres de
              dominio, horas de acceso y direcciones web de referencia. Esta información técnica se procesa de
              manera disociada y no quedará vinculada a su identidad o datos personales de registro.
            </p>
            <p>
              <strong className="font-semibold text-ink">Información descriptiva voluntaria.</strong> El Sitio Web
              de Universo Psi podrá ofrecer a los profesionales la oportunidad de incluir información descriptiva
              adicional en sus perfiles (entre otros, reseñas de experiencia, enfoques teóricos). La inclusión de
              estos datos es enteramente opcional y voluntaria. Al publicar dicha información descriptiva, el
              profesional presta su consentimiento expreso para que Universo Psi la difunda en el catálogo y la
              utilice de acuerdo con las prácticas descritas en esta Política (incluyendo comunicaciones
              institucionales o informativas basadas en su perfil profesional).
            </p>
            <p>
              <strong className="font-semibold text-ink">Prohibición de datos sensibles.</strong> Al registrarse o
              interactuar en el Sitio Web, se prohíbe de forma terminante a los Sujetos Alcanzados incluir, cargar
              o transmitir datos de carácter sensible, entendiendo por tales aquellos que revelen: (i) origen
              racial o étnico, (ii) ideas políticas, (iii) convicciones religiosas o filosóficas, (iv) afiliación
              sindical o política, (v) información de salud física o mental (como historias clínicas o
              diagnósticos médicos), (vi) vida sexual o reproductiva, o (vii) antecedentes penales, judiciales o
              comisión de delitos. Cualquier dato de esta índole que sea detectado podrá ser eliminado de
              inmediato por la plataforma de oficio y sin previo aviso.
            </p>
            <p>
              La totalidad de los Datos Personales recolectados legítimamente por el Sitio Web serán objeto de
              tratamiento automatizado e incorporados a la base de datos de la cual {LEGAL_ENTITY.name} es titular
              y único responsable (en adelante, la “Base de Datos”), la cual se encuentra protegida bajo medidas de
              seguridad técnicas y organizativas adecuadas para evitar su alteración, pérdida o acceso no
              autorizado.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>2. Divulgación en áreas públicas del Sitio Web</h2>
            <p>
              Los Sujetos Alcanzados toman conocimiento y aceptan que si divulgan voluntariamente cualquiera de
              sus datos personales, números de contacto o correos electrónicos en las áreas públicas, foros,
              comentarios o secciones abiertas del Sitio Web, dicha información podrá ser visualizada, indexada
              por motores de búsqueda externos y utilizada por terceros sobre los cuales Universo Psi no tiene
              control ni supervisión alguna.
            </p>
            <p>
              Universo Psi se exime de cualquier tipo de responsabilidad civil o penal por el uso que terceras
              personas hagan de la información que los propios usuarios difundan o pongan a disposición de forma
              pública dentro de la plataforma.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>3. Uso y finalidad de los datos por Universo Psi</h2>
            <p>
              Universo Psi utiliza exclusivamente los datos personales, demográficos, colectivos o técnicos
              obtenidos en el Sitio Web con las siguientes finalidades:
            </p>
            <ul className={listClassName}>
              <li>
                Administrar, gestionar y validar técnicamente el registro de las cuentas de los profesionales.
              </li>
              <li>Operar, mantener, auditar, medir el tráfico y mejorar las funcionalidades del Sitio Web.</li>
              <li>
                Responder de manera eficiente a las consultas, reportes o reclamos que los Sujetos Alcanzados
                remitan a la administración.
              </li>
              <li>
                Enviar comunicaciones institucionales, alertas de seguridad, actualizaciones de la plataforma o
                notificaciones sobre cambios en los Términos y Condiciones, siempre que el usuario haya prestado
                su consentimiento al registrarse o las leyes aplicables lo permitan de forma legítima.
              </li>
            </ul>
            <h3 className={subheadingClassName}>Uso de comentarios y testimonios</h3>
            <p>
              El Sitio Web cuenta con secciones donde los Sujetos Alcanzados pueden ponerse en contacto con la
              administración para enviar comentarios, sugerencias o reseñas de experiencia. Universo Psi podrá
              utilizar dichos comentarios (anonimizando los datos personales si fuera necesario, o utilizándolos
              como un caso de experiencia exitosa de la plataforma) con fines promocionales, de difusión
              publicitaria legítima o para ponerse en contacto con Usted con el objeto de obtener información
              adicional sobre su sugerencia.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>4. Revelación y transferencia de información a terceros</h2>
            <p>
              Universo Psi no vende, comparte ni revela a terceros los datos personales, demográficos o técnicos
              de los Sujetos Alcanzados, excepto en los siguientes supuestos taxativos:
            </p>
            <ul className={listClassName}>
              <li>
                <strong className="font-semibold text-ink">Proveedores de servicios de confianza.</strong> Universo
                Psi podrá revelar dicha información a empresas y profesionales contratados para desempeñar
                funciones operativas en su nombre. Estas tareas incluyen servicios de alojamiento (hosting) de
                servidores, análisis estadístico de datos, asistencia en campañas de comunicación institucional,
                procesamiento de pagos digitales (Mercado Pago) y soporte de atención al cliente. Estas entidades
                tendrán acceso a los datos de manera estrictamente limitada a cuanto resulte necesario para
                cumplir con sus funciones, quedando contractualmente obligadas a no transferir ni utilizar la
                información para ningún otro fin. Universo Psi mantendrá la titularidad y la responsabilidad sobre
                las bases de datos compartidas bajo esta modalidad.
              </li>
              <li>
                <strong className="font-semibold text-ink">Requerimiento legal y autoridades.</strong> Universo Psi
                podrá revelar información si fuera legalmente exigido por una orden judicial, una entidad oficial
                o una autoridad regulatoria competente, o si estimara de buena fe que dicha acción es
                razonablemente necesaria para: (i) ajustarse a mandatos legales o cumplir con un proceso judicial
                en curso; (ii) proteger y defender los derechos o el patrimonio de Universo Psi y sus sociedades
                vinculadas; (iii) prevenir la comisión de un delito o resguardar la seguridad nacional; o (iv)
                salvaguardar la seguridad personal de los usuarios, profesionales o del público en general.
              </li>
              <li>
                <strong className="font-semibold text-ink">Operaciones corporativas y reestructuración.</strong>{" "}
                Universo Psi podrá transferir y ceder sus bases de datos a un tercero que adquiera la totalidad o
                una porción sustancial de su negocio, ya sea por vía de fusión, consolidación, escisión o compra
                directa de activos. En el supuesto de que Universo Psi afronte un procedimiento de insolvencia
                (concurso preventivo o quiebra), el liquidador, administrador o interventor judicial podrá
                disponer de dicha información en el marco de una operación legalmente homologada por el tribunal
                interviniente. Cualquier transferencia global del negocio será informada de manera oportuna a los
                profesionales y usuarios mediante un correo electrónico o a través de un aviso destacado en el
                Sitio Web.
              </li>
              <li>
                <strong className="font-semibold text-ink">Datos disociados y estadísticos.</strong> Universo Psi
                podrá compartir información estadística, colectiva y completamente anonimizada sobre el tráfico y
                comportamiento de los visitantes del Sitio Web con sus socios comerciales y clientes, con el único
                fin de dar a conocer las tendencias de uso de la plataforma, sin que ello revele de ningún modo
                identidades ni datos personales específicos.
              </li>
            </ul>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>
              5. Derechos de los titulares de los datos (acceso, rectificación y supresión)
            </h2>
            <p>
              Los Sujetos Alcanzados gozan de los derechos de acceso, rectificación, actualización y supresión de
              sus datos personales, conforme a lo establecido en la Ley N° 25.326:
            </p>
            <p>
              <strong className="font-semibold text-ink">Autogestión de datos.</strong> Los Profesionales
              Registrados pueden revisar, corregir, actualizar o modificar sus datos de perfil en cualquier
              momento. Para ello, deberán iniciar sesión en su cuenta, dirigirse a la sección de configuración de
              perfil y editar los campos correspondientes a través de las herramientas disponibles en el sistema.
            </p>
            <p>
              <strong className="font-semibold text-ink">
                Derecho de supresión y revocación del consentimiento.
              </strong>{" "}
              Si un profesional o usuario deseara eliminar de forma definitiva sus datos personales de los
              servidores de la plataforma, o quisiera revocar el consentimiento prestado a esta Política de
              Privacidad, deberá solicitarlo de manera formal a través del{" "}
              <Link
                className="font-semibold text-ink underline underline-offset-4"
                href="/solicitudes?tipo=DELETION"
              >
                formulario de baja, arrepentimiento y privacidad
              </Link>
              , que registra el pedido y entrega una constancia sin necesidad de iniciar sesión.
            </p>
            <p>
              <strong className="font-semibold text-ink">Consecuencias de la baja.</strong> El Sujeto Alcanzado
              toma conocimiento de que la revocación del consentimiento o la supresión de sus datos de registro
              implicará la imposibilidad técnica de continuar utilizando las funcionalidades avanzadas de la
              plataforma y la inmediata baja o suspensión de su perfil en el catálogo profesional de Universo Psi.
            </p>
            <p>
              <strong className="font-semibold text-ink">Plazo de conservación.</strong> Con el objetivo de
              garantizar la eficiencia y continuidad en el uso repetido de los servicios técnicos, Universo Psi
              conservará la información de registro de manera continua mientras la cuenta del profesional
              permanezca activa y hasta tanto el titular no ejerza de forma expresa su derecho de supresión o baja
              del servicio.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>6. Seguridad de la información personal</h2>
            <p>
              Universo Psi implementa y mantiene actualizadas medidas de seguridad técnicas y organizativas
              idóneas diseñadas específicamente para resguardar la información personal frente a pérdidas
              accidentales, accesos no autorizados, alteraciones o divulgaciones indebidas. En particular, las
              credenciales de acceso, contraseñas y datos sensibles de las cuentas viajan cifradas mediante
              protocolos de seguridad digital estándar entre el dispositivo del usuario y los servidores de la
              plataforma.
            </p>
            <p>
              Sin perjuicio de estos esfuerzos, el Sujeto Alcanzado reconoce que internet es un sistema abierto y
              global, por lo cual Universo Psi no puede garantizar de manera absoluta que terceros
              malintencionados o ciberdelincuentes no puedan quebrar las defensas informáticas o utilizar la
              información personal para fines indebidos, rigiéndose este aspecto por lo dispuesto en la{" "}
              <Link
                className="font-semibold text-ink underline underline-offset-4"
                href="/terminos#seguridad-informatica"
              >
                Cláusula 10 de los Términos y Condiciones
              </Link>{" "}
              (Seguridad Informática y Exención de Responsabilidad Técnica).
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>7. Uso de la aplicación móvil (Android e iOS)</h2>
            <p>
              La Aplicación Móvil oficial de Universo Psi (en adelante, la “App”) es una herramienta tecnológica
              complementaria de uso interno para los Profesionales Registrados de la plataforma, diseñada con el
              fin de optimizar la gestión de sus perfiles y agilizar la recepción de notificaciones operativas. El
              funcionamiento de la App se rige bajo las siguientes condiciones especiales de privacidad:
            </p>
            <ul className={listClassName}>
              <li>
                <strong className="font-semibold text-ink">Credenciales unificadas.</strong> Los datos de ingreso
                (login) exigidos para el inicio de sesión en la App son idénticos a los gestionados y validados
                previamente por el profesional durante su registro en el Sitio Web.
              </li>
              <li>
                <strong className="font-semibold text-ink">Identificador único (ID) y notificaciones.</strong> Al
                momento del alta del profesional en el Sitio Web, el sistema le asigna de manera automatizada un
                identificador numérico único (ID). Este código es transferido de forma segura a la App para
                reconocer de manera particular a cada cuenta, permitiendo direccionar de forma personalizada e
                individual las notificaciones automáticas (push) correspondientes a su actividad.
              </li>
              <li>
                <strong className="font-semibold text-ink">Finalidad exclusiva de uso.</strong> La App no se
                emplea, no se empleará ni contiene herramientas destinadas a fines publicitarios o de explotación
                comercial masiva. Su uso es estrictamente interno y profesional, sirviendo de manera exclusiva
                como canal de alerta para la recepción de solicitudes de tratamientos psicológicos y consultas
                afines realizadas originalmente por los usuarios en el Sitio Web.
              </li>
            </ul>
            <p>
              Al interactuar con la plataforma o iniciar sesión en la Aplicación Móvil, Usted reconoce
              expresamente haber leído, comprendido y aceptado en su totalidad la presente Política de Privacidad
              y Tratamiento de Datos Personales.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>8. Legislación aplicable, jurisdicción y disposiciones varias</h2>
            <p>
              <strong className="font-semibold text-ink">8.1 Marco normativo.</strong> Esta Política de Privacidad
              se rige en su totalidad por las leyes de la República Argentina, en especial por la Ley N° 25.326 de
              Protección de los Datos Personales, su Decreto Reglamentario N° 1558/2001, y las directivas emitidas
              por la Agencia de Acceso a la Información Pública (AAIP) en su carácter de órgano de control, ante
              la cual los titulares podrán radicar las denuncias que consideren pertinentes (
              <a
                className="font-semibold text-ink underline underline-offset-4"
                href="https://www.argentina.gob.ar/aaip"
                rel="noreferrer noopener"
                target="_blank"
              >
                www.argentina.gob.ar/aaip
              </a>
              ).
            </p>
            <p>
              <strong className="font-semibold text-ink">8.2 Resolución de controversias.</strong> Cualquier
              conflicto derivado de la interpretación, validez o aplicación de la presente Política que no pueda
              ser resuelto de buena fe mediante negociación directa entre las partes, será sometido de forma
              exclusiva a la competencia de los Tribunales Nacionales en lo Comercial con sede en la Ciudad
              Autónoma de Buenos Aires, renunciando los Sujetos Alcanzados a cualquier otro fuero o jurisdicción
              que pudiere corresponder, sin perjuicio de los derechos consagrados bajo la Ley N° 24.240 de Defensa
              del Consumidor.
            </p>
            <p>
              <strong className="font-semibold text-ink">8.3 Acuerdo íntegro y nulidad parcial.</strong> Este
              documento, con los Términos y Condiciones de Uso, conforma el acuerdo íntegro entre el Sujeto
              Alcanzado y Universo Psi. Si una de sus cláusulas fuera declarada inválida o nula por un tribunal
              competente, las restantes disposiciones mantendrán su pleno vigor y efecto legal.
            </p>
            <p>
              <strong className="font-semibold text-ink">8.4 Restricciones de cesión.</strong> El profesional
              registrado no podrá ceder los derechos u obligaciones emergentes de su cuenta sin el consentimiento
              previo y por escrito de la plataforma. Universo Psi podrá ceder sus derechos y obligaciones
              operativas a terceros en el marco de reorganizaciones empresariales, notificando de manera razonable
              a través de sus canales de comunicación.
            </p>
            <p>
              <strong className="font-semibold text-ink">8.5 Tolerancia y no renuncia.</strong> El hecho de que
              Universo Psi no ejerza o demore en el ejercicio de cualquier derecho, facultad o acción legal
              prevista bajo estos términos no constituirá en ningún caso una renuncia al mismo, ni impedirá su
              ejercicio estricto en el futuro ante incumplimientos idénticos o sucesivos.
            </p>
            <p>
              <strong className="font-semibold text-ink">8.6 Canales de contacto.</strong> Para cualquier consulta,
              ejercicio de derechos de acceso, rectificación o supresión de datos, o reclamos operativos, el
              Sujeto Alcanzado podrá contactar de forma directa a Universo Psi mediante los siguientes canales
              oficiales habilitados:
            </p>
            <ul className={listClassName}>
              <li>
                Responsable de la base de datos: {LEGAL_ENTITY.name}, CUIT {LEGAL_ENTITY.taxId}.
              </li>
              <li>Domicilio: {LEGAL_ENTITY.address}.</li>
              <li>
                Correo electrónico:{" "}
                <a
                  className="font-semibold text-ink underline underline-offset-4"
                  href={`mailto:${LEGAL_CONTACT_EMAIL}`}
                >
                  {LEGAL_CONTACT_EMAIL}
                </a>
              </li>
              <li>
                <Link
                  className="font-semibold text-ink underline underline-offset-4"
                  href="/solicitudes"
                >
                  Formulario de baja, arrepentimiento y privacidad
                </Link>
                : para ejercer acceso, rectificación, actualización y supresión de datos, pedir la baja o
                presentar un reclamo. Entrega constancia y no requiere cuenta.
              </li>
              <li>
                <Link className="font-semibold text-ink underline underline-offset-4" href="/contacto">
                  Formulario de contacto
                </Link>
                : para consultas generales, reportes de perfiles o contenidos y soporte de la plataforma.
              </li>
            </ul>
            <p>
              <strong className="font-semibold text-ink">8.7 Órgano de control de datos personales.</strong> Se
              informa que los Sujetos Alcanzados podrán dirigir sus consultas, reclamos o denuncias relativas a la
              protección o tratamiento indebido de sus datos personales ante la Agencia de Acceso a la Información
              Pública (AAIP), en su carácter de Órgano de Control de la Ley N° 25.326, a través de su sitio web
              oficial:{" "}
              <a
                className="font-semibold text-ink underline underline-offset-4"
                href="https://www.argentina.gob.ar/aaip"
                rel="noreferrer noopener"
                target="_blank"
              >
                www.argentina.gob.ar/aaip
              </a>
              .
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>9. Cookies</h2>
            <p>
              Universo Psi utiliza cookies propias y de terceros para garantizar el correcto funcionamiento del
              Sitio Web, analizar el tráfico, personalizar su experiencia y recordar sus preferencias
              profesionales. Sólo las cookies técnicas y necesarias se activan de forma obligatoria: las de
              personalización, análisis y funcionalidades externas permanecen desactivadas hasta que Usted las
              habilite. Puede revisar y modificar su decisión en cualquier momento.
            </p>
            <p>
              <strong className="font-semibold text-ink">Estado actual de la medición.</strong> Desde el 15 de
              septiembre de 2026 la medición opcional de navegación está desactivada en la aplicación, junto con
              los componentes de Vercel Analytics y Speed Insights, y los identificadores de analítica que la
              aplicación guardaba en su navegador se eliminan al volver a visitar el sitio. Esto no elimina
              automáticamente registros anteriores. La sesión de acceso, la preferencia de tema y los registros
              técnicos necesarios para operar y proteger el servicio permanecen.
            </p>
            <CookiePreferencesButton className="mt-2" />
          </section>

          <p className="rounded-2xl border border-senda/25 bg-senda/5 px-5 py-4 text-sm leading-6 text-ink">
            Al utilizar Universo Psi y sus servicios, Usted reconoce de forma expresa haber leído, comprendido en
            su totalidad y aceptado sin reservas la presente Política de Privacidad y Tratamiento de Datos
            Personales.
          </p>
        </div>
      </Container>
    </section>
  );
}
