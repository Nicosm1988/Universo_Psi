import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { LEGAL_CONTACT_EMAIL, LEGAL_ENTITY, TERMS_VERSION_LABEL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description:
    "Condiciones de uso del sitio universopsi.com.ar: acceso, registro, planes de suscripción, moderación, responsabilidad y jurisdicción.",
  alternates: { canonical: "/terminos" },
};

const sectionClassName = "space-y-3";
const headingClassName = "text-lg font-semibold tracking-[-0.01em] text-ink sm:text-xl";
const subheadingClassName = "text-base font-semibold text-ink";
const listClassName = "list-disc space-y-3 pl-5 marker:text-senda";

export default function TermsPage() {
  return (
    <section className="bg-paper py-12 sm:py-16">
      <Container className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-senda">{TERMS_VERSION_LABEL}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-4xl">
          Términos y condiciones de uso
        </h1>

        <div className="mt-9 space-y-9 text-[0.9375rem] leading-7 text-muted">
          <section className={sectionClassName}>
            <p>
              El presente documento (en adelante, los “Términos y Condiciones”) regula el acceso a, la navegación
              en, y el uso del sitio web universopsi.com.ar (en adelante, el “Sitio Web”), de titularidad de{" "}
              {LEGAL_ENTITY.name}, CUIT {LEGAL_ENTITY.taxId}, con domicilio en {LEGAL_ENTITY.address} (en
              adelante, “Universo Psi”).
            </p>
            <p>
              Las presentes disposiciones son aplicables a toda persona humana o jurídica que acceda al Sitio Web,
              incluyendo pero no limitado a los Visitantes, Usuarios, Profesionales de la Salud Mental y similares,
              así como a cualquier herramienta, software, bot, inteligencia artificial (IA) o sistema automatizado
              de interacción o extracción de datos (en adelante, denominados conjuntamente de manera indistinta
              como los “Sujetos Alcanzados” o “Usted”).
            </p>
            <p>
              Cualquier Sujeto Alcanzado acepta en forma voluntaria que el acceso a, y el uso del Sitio Web, de sus
              servicios y de los Contenidos tiene lugar bajo su sola y exclusiva responsabilidad. Sírvase leer este
              documento atentamente antes de utilizar la plataforma.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>Aceptación de los términos y condiciones</h2>
            <p>
              Los presentes Términos y Condiciones poseen carácter obligatorio y vinculante. Por lo tanto, el
              rechazo o la no aceptación de los mismos implicará la prohibición y abstención inmediata de uso del
              Sitio Web. Cualquier Visitante, Usuario, Profesional de la Salud Mental y similar, así como el
              administrador de cualquier sistema automatizado, bot o IA que no acepte estas disposiciones, deberá
              abstenerse de utilizar el Sitio Web y/o los servicios ofrecidos en el mismo.
            </p>
            <p>
              Por el solo hecho de acceder, navegar o utilizar el Sitio Web, se entiende que el sujeto ingresante
              ha aceptado de plena conformidad y sin reserva alguna los Términos y Condiciones vigentes al momento
              de su acceso, obligándose a cumplir con todas las disposiciones aquí contenidas en virtud de las
              leyes y regulaciones aplicables.
            </p>
            <p>
              Universo Psi se reserva el derecho de revisar, actualizar o modificar estos Términos y Condiciones en
              cualquier momento y sin previo aviso. Es responsabilidad de cada Sujeto Alcanzado revisar este
              documento de manera periódica, ya que el uso continuado de la plataforma constituirá la aceptación
              implícita de las modificaciones introducidas.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>1. Acceso y uso del Sitio Web y sus servicios</h2>
            <p>
              Con carácter general, el acceso y la navegación por el Sitio Web son libres y no exigen la previa
              suscripción o registro de los Sujetos Alcanzados. Sin perjuicio de ello, la utilización de
              determinadas funcionalidades, herramientas avanzadas o la publicación en el catálogo profesional
              requiere la suscripción previa, el registro y/o el pago de un precio, conforme a las condiciones
              particulares establecidas en el apartado “Planes de suscripción”.
            </p>
            <p>
              Todo Sujeto Alcanzado se compromete a utilizar el Sitio Web, sus contenidos y sus servicios de
              conformidad con la ley aplicable, los presentes Términos y Condiciones, la moral, las buenas
              costumbres y el orden público.
            </p>
            <p>
              Queda estrictamente prohibido utilizar el Sitio Web con fines o efectos ilícitos, contrarios a lo
              establecido en este documento, lesivos de los derechos e intereses de terceros, o de cualquier forma
              que pueda dañar, inutilizar, sobrecargar, deteriorar o impedir la normal operación y utilización del
              Sitio Web y de sus servicios por parte de los demás Usuarios y de Universo Psi.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>2. Finalidad del Sitio Web y restricciones de contenido</h2>
            <p>
              El Sitio Web es una plataforma de intermediación y difusión destinada exclusivamente a propósitos
              legales y lícitos, sirviendo como canal de contacto entre:
            </p>
            <ul className={listClassName}>
              <li>
                <strong className="font-semibold text-ink">Visitantes y Usuarios:</strong> personas humanas o
                jurídicas que se encuentren en la búsqueda de profesionales o instituciones del ámbito de la salud
                mental, rehabilitación y disciplinas afines.
              </li>
              <li>
                <strong className="font-semibold text-ink">Profesionales e Instituciones:</strong> prestadores de
                servicios que deseen publicitar, ofrecer y difundir sus servicios a través del catálogo de la
                plataforma.
              </li>
            </ul>
            <p>
              A los efectos de los presentes Términos y Condiciones, el concepto de “Profesionales de la Salud
              Mental y similares” abarca, de manera enunciativa pero no limitativa, a profesionales y técnicos con
              orientación, enfoque o especialización en:
            </p>
            <ul className={listClassName}>
              <li>
                <strong className="font-semibold text-ink">Psicoterapia y abordajes clínicos:</strong>{" "}
                Acompañamiento Psicológico, Análisis Transaccional, Brainspotting, EMDR (Desensibilización y
                Reprocesamiento por Movimientos Oculares), Logoterapia, Mindfulness aplicado a la psicoterapia,
                Neuropsicología, Psicoanálisis, Psicocorporal Reichiana, Psicodrama, Psicología Adleriana,
                Psicología Analítica / Junguiana, Psicología Positiva, Psicoterapia o Terapia Breve (incluyendo
                orientaciones Estratégica y Centrada en Soluciones), Terapia Cognitivo-Conductual (TCC),
                Psicoterapia Constructivista, Psicoterapia Existencial, Psicoterapia Focal, Psicoterapia
                Gestáltica, Psicoterapia Humanista, Psicoterapia Integral/Integrativa, Psicoterapia Interpersonal,
                Psicoterapia Psicodinámica, Psicoterapia Relacional, Psicoterapia Sistémica/Sistémico-Relacional,
                Psicoterapia Transpersonal, Psicoterapia en Deportología, Sexología, Terapia Centrada en Esquemas,
                Terapia Centrada en la Compasión, Terapia Centrada en la Persona, Terapia Contextual, Terapia
                Dialéctico-Conductual (DBT), Terapia Focalizada en las Emociones, Terapia Metacognitiva, Terapia
                Narrativa, Terapia Racional Emotivo-Conductual (TREC), Terapia Sensoriomotriz, Terapia de
                Aceptación y Compromiso (ACT), Terapia de Activación Conductual y Terapia de Resolución de
                Problemas.
              </li>
              <li>
                <strong className="font-semibold text-ink">Rehabilitación y disciplinas relacionadas:</strong>{" "}
                Acompañamiento Terapéutico, Estimulación Cognitiva, Fonoaudiología, Kinesiología, Musicoterapia,
                Psicomotricidad, Psicopedagogía, Rehabilitación Cognitiva / Neurocognitiva, Terapia o
                Rehabilitación del Lenguaje y Terapia Ocupacional.
              </li>
            </ul>

            <h3 className={subheadingClassName}>Restricciones de contenido e información</h3>
            <p>
              Queda estrictamente prohibido a los Sujetos Alcanzados utilizar el Sitio Web para transmitir,
              publicar, distribuir, almacenar, cargar, destruir o eliminar material, comentarios, perfiles o
              información que:
            </p>
            <ul className={listClassName}>
              <li>
                a) Infrinja o vulnere las leyes, estatutos o regulaciones locales, nacionales o internacionales
                vigentes.
              </li>
              <li>
                b) Infrinja derechos de autor, patentes, marcas registradas, secretos comerciales o cualquier otro
                derecho de propiedad intelectual o industrial de Universo Psi o de terceros.
              </li>
              <li>
                c) Viole la confidencialidad, el secreto profesional, el derecho al honor, a la intimidad, a la
                propia imagen o demás derechos personalísimos de otras personas.
              </li>
              <li>
                d) Resulte de cualquier modo difamatorio, obsceno, pornográfico, amenazador, injurioso, ofensivo,
                discriminatorio o que promueva el odio y la violencia.
              </li>
            </ul>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>
              3. Reglas de seguridad, prohibiciones de uso y facultad de exclusión
            </h2>
            <p>
              Queda terminantemente prohibido a los Sujetos Alcanzados atentar contra la seguridad, la integridad o
              el correcto funcionamiento de la plataforma. A título ejemplificativo y de manera enunciativa, se
              prohíbe estrictamente utilizar el Sitio Web para:
            </p>
            <ul className={listClassName}>
              <li>
                <strong className="font-semibold text-ink">a) Falsedad de información:</strong> publicar, anunciar o
                suministrar datos biográficos, profesionales, académicos, de contacto, matrículas o certificaciones
                que sean incompletos, falsos, inexactos, simulados o desactualizados.
              </li>
              <li>
                <strong className="font-semibold text-ink">b) Duplicidad de cuentas:</strong> registrar, administrar
                o mantener más de una cuenta activa correspondiente a una misma persona humana o jurídica, salvo
                autorización expresa y por escrito de Universo Psi.
              </li>
              <li>
                <strong className="font-semibold text-ink">c) Acceso y autorización indebidos:</strong> acceder a
                datos, servidores, endpoints de APIs o cuentas cuyo acceso no esté expresamente autorizado;
                realizar robos de sesiones, escalamiento de privilegios, manipulación de permisos, consultas
                automatizadas no autorizadas o ingresar a perfiles ajenos.
              </li>
              <li>
                <strong className="font-semibold text-ink">d) Abuso de credenciales:</strong> revelar, ceder o
                compartir las contraseñas de acceso con terceras personas, o utilizarlas para cualquier propósito
                no autorizado en caso de poseer credenciales que permitan el ingreso a áreas restringidas o no
                públicas del Sitio Web.
              </li>
              <li>
                <strong className="font-semibold text-ink">
                  e) Análisis de vulnerabilidades y herramientas ofensivas:
                </strong>{" "}
                evaluar, escanear o probar la vulnerabilidad del Sitio Web, sus sistemas o redes; eludir o
                quebrantar las medidas de seguridad, identificación o autenticación; y utilizar herramientas
                ofensivas (escáneres, exploits, pruebas de penetración o análisis automatizados) sin la previa
                autorización por escrito de Universo Psi.
              </li>
              <li>
                <strong className="font-semibold text-ink">f) Malware y código malicioso:</strong> introducir,
                propagar o distribuir virus, ransomware, spyware, troyanos, gusanos (worms) o cualquier otra rutina
                de programación maliciosa orientada a dañar, interferir negativamente, interceptar de forma no
                autorizada o apropiarse de sistemas, redes o datos del Sitio Web.
              </li>
              <li>
                <strong className="font-semibold text-ink">g) Ataques de autenticación y evasión:</strong> realizar
                ataques de fuerza bruta o credential stuffing; utilizar credenciales robadas; evadir sistemas de
                doble factor (2FA) o controles de seguridad como CAPTCHA, límites de velocidad (rate limits),
                sistemas antifraude y mecanismos de moderación o detección; así como crear cuentas de forma masiva
                y automatizada.
              </li>
              <li>
                <strong className="font-semibold text-ink">h) Inyección de código y manipulación técnica:</strong>{" "}
                ejecutar ataques de inyección de código o comandos (SQL Injection, Cross-Site Scripting — XSS,
                inyección de plantillas — SSTI o scripts); y manipular el funcionamiento del sitio mediante la
                alteración de formularios, URLs, cookies, tokens, cabeceras HTTP, solicitudes o mecanismos de pago.
              </li>
              <li>
                <strong className="font-semibold text-ink">i) Ingeniería inversa:</strong> intentar descifrar,
                descompilar, desensamblar u obtener el código fuente de cualquier programa de software, base de
                datos o arquitectura tecnológica que comprenda o constituya una parte de este Sitio Web.
              </li>
              <li>
                <strong className="font-semibold text-ink">j) Saturación de infraestructura y abuso de APIs:</strong>{" "}
                sobrecargar, saturar o inundar los sistemas (flooding, spamming, crashing); generar tráfico
                automatizado abusivo que consuma deliberadamente los recursos; y manipular parámetros o endpoints
                de las APIs.
              </li>
              <li>
                <strong className="font-semibold text-ink">
                  k) Navegación y extracción automatizada (scraping):
                </strong>{" "}
                desarrollar actividades de scraping no autorizado, crawling agresivo, uso de bots para la
                extracción sistemática o masiva de datos, indexación no autorizada o exfiltración de bases de datos
                mediante agentes o modelos de inteligencia artificial, utilizando mecanismos distintos a los
                exploradores web comerciales estándar de uso general (tales como Google Chrome, Mozilla Firefox,
                Apple Safari, Microsoft Edge, entre otros).
              </li>
              <li>
                <strong className="font-semibold text-ink">
                  l) Suplantación, fraude y ataques de redirección:
                </strong>{" "}
                realizar maniobras de phishing, ingeniería social o impersonación de profesionales; falsificar
                cabeceras de paquetes TCP/IP o datos en correos y foros; ejecutar redirecciones maliciosas o
                ataques de falsificación de solicitudes (CSRF / SSRF); y enviar correos masivos no solicitados
                (spam), promociones o publicidad no autorizada.
              </li>
              <li>
                <strong className="font-semibold text-ink">m) Alteración de contenidos e integridad:</strong>{" "}
                borrar, modificar, editar o revisar de forma no autorizada contenidos, reseñas, perfiles, mensajes,
                registros o información publicada por otra persona, profesional o entidad; introducir o explotar
                componentes, complementos, paquetes o integraciones comprometidas; y alterar, borrar u ocultar los
                registros de seguridad (logs) y auditorías.
              </li>
              <li>
                <strong className="font-semibold text-ink">n) Divulgación irresponsable:</strong> publicar, difundir
                o explotar fallos o vulnerabilidades del sistema antes de haberlos comunicado formalmente a través
                del{" "}
                <Link className="font-semibold text-ink underline underline-offset-4" href="/contacto">
                  canal de seguridad establecido por Universo Psi
                </Link>
                .
              </li>
            </ul>

            <h3 className={subheadingClassName}>Sanciones y cooperación con autoridades</h3>
            <p>
              La violación de la seguridad del sistema o de la red generará responsabilidades civiles y penales
              directas. Universo Psi investigará activamente de oficio o por denuncia cualquier hecho que pueda
              constituir una vulneración a estas normas, y cooperará plenamente con las autoridades judiciales,
              policiales y regulatorias competentes para perseguir, identificar y sancionar a los involucrados en
              dichas violaciones, atentados o incumplimientos.
            </p>

            <h3 className={subheadingClassName}>Derecho de exclusión, suspensión y baja del sistema</h3>
            <p>
              Universo Psi se reserva el derecho exclusivo de dar de baja, retirar o eliminar cualquier anuncio,
              perfil o contenido publicado que, a su solo criterio, no cumpla con los estándares definidos en estos
              Términos y Condiciones o con las políticas vigentes de la plataforma, sin que ello genere derecho a
              reclamo, indemnización ni resarcimiento alguno a favor del sujeto afectado.
            </p>
            <p>
              Idéntica facultad asistirá a Universo Psi para suspender temporalmente o dar de baja definitiva del
              sistema a cualquier Sujeto Alcanzado por haber incumplido las presentes disposiciones, o por haber
              incurrido, a exclusivo criterio de Universo Psi, en conductas, omisiones o actos engañosos, dolosos,
              abusivos o fraudulentos mediante el uso del Sitio Web o de los servicios prestados por el mismo.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>
              4. Limitación general de responsabilidad y exención por contenidos de terceros
            </h2>
            <p>
              <strong className="font-semibold text-ink">Responsabilidad del acceso.</strong> El acceso y uso del
              Sitio Web es totalmente voluntario, libre y bajo la exclusiva responsabilidad de cada Sujeto
              Alcanzado. En consecuencia, Universo Psi no será responsable ni deberá responder por ninguna
              consecuencia, daño, perjuicio directo, indirecto o lucro cesante derivado de dicho acceso, ni del uso
              que se haga de la información, enlaces o datos incluidos en la plataforma.
            </p>
            <ul className={listClassName}>
              <li>
                <strong className="font-semibold text-ink">Responsabilidad por el material publicado.</strong>{" "}
                Universo Psi no es responsable bajo ninguna circunstancia por el material, textos, imágenes,
                opiniones, perfiles o datos expuestos en la web por terceros. Toda información publicada es de
                exclusiva responsabilidad del Sujeto Alcanzado que la aporta. Quienes remitan datos al Sitio Web se
                comprometen legalmente a que estos sean veraces, exactos, actualizados y a que no vulneren la
                legalidad vigente ni derechos de terceros.
              </li>
              <li>
                <strong className="font-semibold text-ink">Sistema de validación y certificación.</strong> A fin de
                promover la transparencia, el Sitio Web solicita a los profesionales ciertos datos personales y
                copias de documentación respaldatoria (como títulos habilitantes o matrículas profesionales) para
                otorgar un logo de certificación o validación en sus perfiles. No obstante, Universo Psi no
                garantiza, no responde ni está obligado a responder por la autenticidad, validez o veracidad de los
                documentos aportados, declinando cualquier responsabilidad por falsificaciones, adulteraciones o
                declaraciones juradas mendaces por parte de los Profesionales de la Salud Mental y similares.
              </li>
              <li>
                <strong className="font-semibold text-ink">Exclusión de responsabilidad profesional.</strong>{" "}
                Universo Psi opera estrictamente como una plataforma de difusión e intermediación digital. Por lo
                tanto, declina explícitamente cualquier tipo de responsabilidad civil, penal, ética o profesional
                por los servicios prestados, tratamientos, intervenciones, diagnósticos, opiniones o datos que
                eventualmente los profesionales o instituciones ofrezcan o ejecuten a raíz de un contacto en la red
                o de forma externa al Sitio Web. Universo Psi no ejerce ningún tipo de supervisión, auditoría
                clínica ni control sobre la práctica profesional de los anunciantes.
              </li>
            </ul>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>5. Propiedad intelectual y uso de los contenidos del Sitio Web</h2>
            <p>
              Los contenidos de este Sitio Web, tales como textos, gráficos, imágenes, diseños, logos, íconos,
              software, bases de datos, marcas, nombres comerciales y cualquier otro material (en adelante
              referidos de manera conjunta como el “Contenido”), están protegidos por la legislación nacional e
              internacional vigente sobre propiedad industrial e intelectual. Todo el Contenido es propiedad
              exclusiva de Universo Psi, de sus proveedores de contenido o de sus clientes licenciantes.
            </p>
            <p>
              La compilación, entendida como recopilación, ordenamiento, disposición, estructura y montaje de la
              totalidad del Contenido de este Sitio Web es de propiedad exclusiva de Universo Psi y se encuentra
              estrictamente protegida por las leyes de propiedad intelectual de la República Argentina.
            </p>
            <p>
              El uso no autorizado, copia o alteración del Contenido constituye una violación directa de las
              normativas de derechos de autor, marcas comerciales y demás legislación aplicable, quedando sujeto el
              infractor a las sanciones civiles y penales correspondientes.
            </p>
            <p>
              Cualquier Sujeto Alcanzado que cuente con autorización para realizar una copia o descarga temporal de
              alguna porción del Contenido deberá conservar de manera obligatoria todas las advertencias, leyendas
              y reservas sobre derechos de autor, marcas registradas o de servicio contenidas en el material
              original. Queda estrictamente prohibido a los Sujetos Alcanzados:
            </p>
            <ul className={listClassName}>
              <li>
                a) Modificar, reproducir, exhibir, distribuir, transmitir, ceder, vender, alquilar o realizar
                cualquier explotación comercial o de difusión pública del Contenido, salvo autorización previa,
                expresa y por escrito de Universo Psi.
              </li>
              <li>
                b) Utilizar, incorporar o replicar el Contenido de Universo Psi en cualquier otro sitio web,
                plataforma digital, aplicación móvil o red informática, independientemente de cuál sea su
                finalidad.
              </li>
            </ul>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>6. Registro en el Sitio Web y tratamiento de datos personales</h2>
            <p>
              El acceso a las funcionalidades avanzadas de la plataforma y la publicación en el catálogo
              profesional requieren el registro previo de los Profesionales de la Salud Mental y similares (ya sean
              personas humanas o jurídicas), quienes deberán crear una cuenta comercial en el enlace oficial de la
              plataforma: universopsi.com.ar.
            </p>

            <h3 className={subheadingClassName}>Requisitos de registro y autenticación</h3>
            <p>
              Para habilitar su cuenta, el Profesional Registrado deberá proporcionar información veraz, completa,
              exacta y actualizada. El proceso de alta y validación técnica podrá realizarse mediante:
            </p>
            <ul className={listClassName}>
              <li>Formulario de registro directo con correo electrónico válido y contraseña segura.</li>
              <li>
                Autenticación e inicio de sesión unificado a través de proveedores externos habilitados en la
                plataforma (como Google u otras opciones de Single Sign-On disponibles).
              </li>
            </ul>

            <h3 className={subheadingClassName}>Confidencialidad y uso de la información</h3>
            <p>
              Al registrarse en el Sitio Web, se le solicitará al profesional cierta información y datos de
              contacto, incluyendo obligatoriamente una dirección de correo electrónico válida (en adelante, su
              “Información”).
            </p>
            <p>
              Sin perjuicio de las disposiciones específicas contenidas en la{" "}
              <Link className="font-semibold text-ink underline underline-offset-4" href="/privacidad">
                Política de privacidad
              </Link>{" "}
              de la plataforma, Universo Psi se compromete formalmente a no revelar, transferir ni comercializar
              con terceras partes su nombre, dirección de correo electrónico o número de teléfono sin su
              consentimiento previo. Quedan exceptuados aquellos casos en que dicha divulgación sea exigida por
              orden judicial, cumplimiento de leyes vigentes o procedimientos legales de autoridades competentes.
              Universo Psi se reserva el derecho exclusivo de utilizar dicha Información para ofrecerle
              comunicaciones, servicios y productos relacionados estrictamente con el ecosistema y funcionamiento
              del Sitio Web.
            </p>

            <h3 className={subheadingClassName}>Custodia de credenciales y responsabilidad</h3>
            <p>
              Cada Profesional Registrado es el único y exclusivo responsable de mantener la estricta
              confidencialidad de sus datos de acceso y de su contraseña. En consecuencia, responderá de forma
              directa por la totalidad de las acciones, publicaciones, mensajes o usos que se realicen bajo su
              registro, independientemente de si estos fueron autorizados o no por el titular de la cuenta. Es
              obligación del profesional notificar de forma inmediata a Universo Psi sobre cualquier uso no
              autorizado, sospecha de hackeo o vulneración de seguridad de su cuenta o contraseña.
            </p>

            <h3 className={subheadingClassName}>Veracidad y obligación de actualización (baja del servicio)</h3>
            <p>
              Los Profesionales Registrados garantizan la veracidad, exactitud, vigencia y autenticidad de toda la
              Información facilitada, asumiendo la obligación legal de mantenerla debidamente actualizada.
              Asimismo, se comprometen a gestionar la baja inmediata de su perfil en el servicio en el momento
              exacto en que dejen de ejercer la profesión, suspendan, cancelen o pierdan su matrícula habilitante,
              dejen de estar interesados en mantener su continuidad en la plataforma, o decidan revocar su
              consentimiento para recibir comunicaciones comerciales o promociones por cualquier canal.
            </p>

            <h3 className={subheadingClassName}>Beneficios y publicaciones gratuitas</h3>
            <p>
              En el supuesto de que el Sitio Web ofrezca o asigne a los profesionales el beneficio de publicar sus
              servicios bajo una modalidad bonificada o gratuita, estos toman conocimiento y aceptan expresamente
              que Universo Psi se reserva la facultad de limitar, modificar, suspender o dar por terminada la
              vigencia de dicho beneficio en cualquier momento y sin previo aviso, sin que ello genere a favor del
              profesional derecho alguno a reclamo, indemnización ni resarcimiento económico alguno.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>
              7. Obligaciones de los Visitantes y Usuarios y sistema de moderación
            </h2>
            <p>
              <strong className="font-semibold text-ink">Responsabilidad de las comunicaciones.</strong> Cada
              Visitante o Usuario es el único y exclusivo responsable de sus propias comunicaciones, mensajes,
              valoraciones, reseñas y de las consecuencias directas o indirectas de su publicación en la
              plataforma.
            </p>
            <p>
              <strong className="font-semibold text-ink">Prohibiciones de publicación.</strong> Por el hecho de
              utilizar el Sitio Web, los Sujetos Alcanzados se obligan a abstenerse de realizar las siguientes
              acciones:
            </p>
            <ul className={listClassName}>
              <li>
                a) Publicar, anunciar o transmitir material que infrinja derechos de propiedad intelectual,
                industrial, patentes o marcas de terceros, así como derechos de confidencialidad, secreto
                profesional o derecho a la propia imagen.
              </li>
              <li>
                b) Anunciar o difundir material que sea obsceno, difamatorio, amenazador, acosador, injurioso,
                denigrante, discriminatorio o lesivo hacia otros Visitantes, Usuarios, Profesionales de la Salud
                Mental y similares, o hacia cualquier otra persona o entidad.
              </li>
              <li>c) Publicar imágenes, contenido o declaraciones sexualmente explícitas o pornográficas.</li>
              <li>
                d) Anunciar publicidad, propuestas de negocio no autorizadas, esquemas piramidales o comunicaciones
                comerciales no solicitadas.
              </li>
              <li>e) Suplantar la identidad de otra persona humana o jurídica, o falsificar datos de perfiles.</li>
              <li>
                f) Enviar o cargar material que contenga virus informáticos, troyanos, gusanos (worms) o cualquier
                otra rutina de programación maliciosa orientada a dañar, interferir negativamente, interceptar de
                forma no autorizada o apropiarse de sistemas, redes o datos del Sitio Web.
              </li>
            </ul>

            <h3 className={subheadingClassName}>Exención de respaldo e intermediación neutral</h3>
            <p>
              Universo Psi no afirma, no garantiza ni se hace responsable por la licitud, exactitud, veracidad o
              fiabilidad de las comunicaciones, opiniones, valoraciones o datos anunciados por los Visitantes o
              Usuarios en la plataforma, ni respalda las opiniones expresadas por estos. Cada Sujeto Alcanzado
              acepta de forma expresa que cualquier decisión basada en los contenidos o datos publicados por otros
              usuarios se realiza bajo su propio riesgo y exclusiva responsabilidad.
            </p>
            <p>
              El Sitio Web opera estrictamente como una plataforma de intermediación y alojamiento de datos de
              terceros. En consecuencia, Universo Psi funciona de manera neutral ante la información remitida por
              los Visitantes o Usuarios, por lo que no está obligada a auditar las comunicaciones de forma previa a
              su publicación, ni asume la obligación de revisar el material una vez difundido.
            </p>

            <h3 className={subheadingClassName}>Sistema de moderación y facultades de aprobación</h3>
            <p>
              Con el único fin de velar por la calidad de la información dentro de la plataforma, Universo Psi se
              reserva la facultad de implementar un sistema de control y autorización previa sobre las siguientes
              acciones:
            </p>
            <ul className={listClassName}>
              <li>
                a) El alta de nuevos registros de perfiles, así como las modificaciones sucesivas de los datos
                personales o profesionales de las cuentas.
              </li>
              <li>
                b) Las valoraciones, puntuaciones, opiniones y comentarios efectuados por los Visitantes o Usuarios
                sobre los Profesionales de la Salud Mental y similares del catálogo.
              </li>
            </ul>
            <p>
              Si Universo Psi considera que alguna de estas acciones vulnera los presentes Términos y Condiciones,
              carece de veracidad o validez, o resulta perjudicial para el correcto funcionamiento del sitio, podrá
              denegar su autorización o declarar la nulidad de la publicación.
            </p>
            <p>
              A pesar de la existencia de este filtro de control no exhaustivo, Universo Psi se exime expresamente
              de cualquier tipo de responsabilidad en caso de que una publicación autorizada contenga datos falsos,
              inexactos, difamatorios o nocivos. La responsabilidad civil, penal o ética derivada de dicho
              contenido recaerá de forma exclusiva sobre el Sujeto Alcanzado que lo introdujo en la plataforma en
              primer término.
            </p>

            <h3 className={subheadingClassName}>Reportes, investigaciones y derecho de admisión</h3>
            <p>
              En caso de que un Visitante o Usuario notifique a la plataforma la existencia de contenidos o
              comunicaciones que presuntamente incumplan estos Términos y Condiciones, Universo Psi se reserva el
              derecho de investigar el hecho y determinar de buena fe, a su sola discreción, el retiro o la
              permanencia de dichas publicaciones.
            </p>
            <p>
              Universo Psi no asume ninguna obligación ni responsabilidad legal frente a los Visitantes o Usuarios
              respecto a la ejecución o resultado de dichas actividades de control. Asimismo, se reserva el derecho
              irrestricto de impedir el acceso a la plataforma, suspender cuentas o suprimir de forma definitiva
              cualquier comunicación que considere injuriosa, ilegal o contraria a las políticas vigentes de la
              empresa, sin necesidad de justificación previa ni derecho a reclamo alguno por parte del infractor.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>8. Modificación, duración y terminación de los servicios</h2>
            <p>
              <strong className="font-semibold text-ink">Facultad de modificación.</strong> Universo Psi se reserva
              la facultad de efectuar, en cualquier momento y sin previo aviso, modificaciones, actualizaciones o
              mejoras en la configuración, diseño, funcionalidades y presentación del Sitio Web, así como en las
              condiciones de acceso a sus contenidos.
            </p>
            <p>
              <strong className="font-semibold text-ink">Duración del servicio.</strong> La prestación de los
              servicios y la puesta a disposición de los contenidos del Sitio Web tienen, en principio, una
              duración indefinida.
            </p>
            <p>
              <strong className="font-semibold text-ink">Suspensión y terminación.</strong> Sin perjuicio de lo
              precedentemente dispuesto, Universo Psi se encuentra expresamente autorizado para dar por terminada,
              interrumpir o suspender de forma inmediata, parcial o total, la prestación del servicio del Sitio Web
              y/o de cualquiera de sus herramientas en cualquier momento, de forma discrecional y sin necesidad de
              invocación de causa, conforme a lo establecido en los presentes Términos y Condiciones. Siempre que
              las circunstancias lo permitan y resulte razonablemente posible, Universo Psi notificará previamente
              a los Sujetos Alcanzados sobre la suspensión, interrupción o cese definitivo de las actividades de la
              plataforma.
            </p>
            <p>
              <strong className="font-semibold text-ink">Garantía de reintegro por servicios pagos.</strong> En el
              supuesto de que se determine la terminación anticipada o la suspensión definitiva de uno o más
              servicios del Sitio Web que requieran un pago previo, Universo Psi se compromete formalmente a
              efectuar el reintegro monetario proporcional correspondiente a las cuotas o saldos que abarquen el
              período contratado y no gozado por el profesional debido a dicha interrupción, garantizando la
              equidad comercial de la transacción.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>9. Planes de suscripción, tarifas y facturación</h2>
            <p>
              <strong className="font-semibold text-ink">Contratación y mora.</strong> La publicación en el catálogo
              profesional del Sitio Web requiere la contratación de un Plan de Suscripción periódico, cuyos valores
              y condiciones vigentes deberán ser aceptados expresamente por el profesional al momento del alta. La
              sola aceptación de estos Términos y Condiciones implica la obligación de pago del Plan de Suscripción
              mensual contratado. Universo Psi se reserva el derecho de suspender o dar de baja de forma inmediata
              la cuenta y la publicación del perfil en caso de que el Plan de Suscripción no se encuentre
              totalmente abonado al día 5 (cinco) de cada mes, quedando facultada la plataforma para retirar al
              Profesional de la Salud Mental y similar de los resultados del buscador. Asimismo, Universo Psi se
              reserva el derecho de iniciar las acciones judiciales y extrajudiciales que estime pertinentes para
              obtener el cobro de sumas adeudadas.
            </p>
            <p>
              <strong className="font-semibold text-ink">Modificación de los planes de suscripción.</strong>{" "}
              Universo Psi se reserva el derecho de actualizar, modificar, cambiar, agregar o eliminar los valores
              de los Planes de Suscripción vigentes en cualquier momento. Dichas modificaciones serán notificadas a
              los profesionales con una antelación mínima de 5 (cinco) días corridos.
            </p>
            <p>
              <strong className="font-semibold text-ink">Planes promocionales.</strong> Universo Psi podrá modificar
              temporalmente las tarifas de sus Planes de Suscripción por motivos de promociones, bonificaciones de
              bienvenida o lanzamientos especiales. Estas modificaciones serán efectivas de forma inmediata a
              partir del momento en que se hagan públicas en la plataforma o se envíe la comunicación respectiva.
            </p>
            <p>
              <strong className="font-semibold text-ink">Pasarela de pagos externa (Mercado Pago).</strong> Los
              pagos por la contratación de los Planes de Suscripción se procesarán de forma exclusiva a través de
              la plataforma externa Mercado Pago (u otras pasarelas habilitadas por el Sitio Web), donde se le
              requerirá al Profesional de la Salud Mental y similar la información financiera pertinente para
              concretar la transacción. Universo Psi no solicita, no almacena ni recopila en sus servidores datos
              sensibles de tarjetas de crédito o débito. En consecuencia, Universo Psi se deslinda de cualquier
              tipo de responsabilidad civil, penal o comercial respecto al uso indebido, filtraciones, fallas
              técnicas o tratamiento ilegítimo de datos que Mercado Pago pudiera realizar con dicha información. Se
              recomienda a los Profesionales de la Salud Mental y similares la lectura atenta de los términos y
              condiciones de dicha plataforma de pago.
            </p>
          </section>

          <section className={sectionClassName} id="baja-y-arrepentimiento">
            <h2 className={headingClassName}>Información operativa sobre baja y arrepentimiento</h2>
            <p>
              Esta sección describe cómo se ejercen en la práctica los derechos de baja y arrepentimiento. No
              sustituye ni limita lo establecido en la cláusula 9 ni ningún derecho legal de reintegro.
            </p>
            <p>
              Podés registrar una solicitud de{" "}
              <Link
                className="font-semibold text-ink underline underline-offset-4"
                href="/solicitudes?tipo=CANCELLATION"
              >
                baja
              </Link>{" "}
              o de{" "}
              <Link
                className="font-semibold text-ink underline underline-offset-4"
                href="/solicitudes?tipo=WITHDRAWAL"
              >
                arrepentimiento
              </Link>{" "}
              sin iniciar sesión, desde los enlaces visibles en la plataforma. Guardá la constancia de recepción.
              La cancelación del débito también puede gestionarse desde tu cuenta de Mercado Pago; cerrar una
              cuenta en Universo Psi no acredita por sí solo esa cancelación. El equipo debe confirmar la gestión
              correspondiente.
            </p>
          </section>

          <section className={sectionClassName} id="seguridad-informatica">
            <h2 className={headingClassName}>10. Seguridad informática y exención de responsabilidad técnica</h2>
            <p>
              Universo Psi implementa medidas de seguridad razonables para proteger la plataforma; sin embargo, no
              garantiza la ausencia absoluta de virus, código malicioso, malware, ransomware, software espía u
              otros elementos tecnológicos dañinos introducidos por terceros que puedan producir alteraciones,
              fallas o pérdidas de datos en los sistemas informáticos, archivos o dispositivos de los Sujetos
              Alcanzados.
            </p>
            <p>
              En consecuencia, Universo Psi declina cualquier tipo de responsabilidad contractual o
              extracontractual frente a cualquier persona humana o jurídica, Profesional de la Salud Mental y
              similar, Visitante o Usuario, que se vieran afectados por daños directos, indirectos, incidentales o
              perjuicios técnicos derivados de fallas de seguridad, ciberataques o transmisiones de elementos
              nocivos a través del Sitio Web. Cada Sujeto Alcanzado asume el riesgo técnico y es responsable de
              contar con sus propias herramientas de protección, antivirus y copias de seguridad de sus sistemas.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>11. Términos de uso adicionales</h2>
            <p>
              Determinadas áreas, herramientas avanzadas o servicios específicos dentro de este Sitio Web pueden
              estar sujetos a términos, políticas y condiciones de uso adicionales. Al acceder o utilizar dichas
              secciones, o cualquier parte de las mismas, el Sujeto Alcanzado acepta de forma expresa cumplir de
              manera obligatoria con los términos adicionales aplicables y vigentes para esas respectivas áreas.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>12. Legislación aplicable</h2>
            <p>
              Los presentes Términos y Condiciones se rigen en su totalidad por las leyes y regulaciones vigentes
              en la República Argentina, en particular por la Ley N° 25.326 de Protección de los Datos Personales,
              su Decreto Reglamentario N° 1558/2001, la Ley N° 24.240 de Defensa del Consumidor, y demás
              normativas concordantes en materia de protección de datos, comercio electrónico, no discriminación e
              inteligencia artificial, conforme oportunamente pudieren ser reformadas.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>13. Resolución de controversias</h2>
            <p>
              Cualquier conflicto derivado de la interpretación, validez o aplicación de los presentes Términos y
              Condiciones que no pueda ser resuelto de buena fe mediante negociación directa entre las partes, será
              sometido de forma exclusiva a la competencia de los Tribunales Nacionales en lo Comercial con sede en
              la Ciudad Autónoma de Buenos Aires, renunciando los Sujetos Alcanzados a cualquier otro fuero o
              jurisdicción que pudiere corresponder, sin perjuicio de los derechos consagrados bajo la Ley N°
              24.240 de Defensa del Consumidor.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>14. Disposiciones varias</h2>
            <p>
              <strong className="font-semibold text-ink">14.1 Acuerdo íntegro.</strong> Los presentes Términos y
              Condiciones, junto con la{" "}
              <Link className="font-semibold text-ink underline underline-offset-4" href="/privacidad">
                Política de privacidad
              </Link>{" "}
              y cualquier condición particular o términos adicionales aplicables a servicios específicos,
              constituyen el acuerdo íntegro, único y vinculante entre el Sujeto Alcanzado y Universo Psi respecto
              del uso, navegación e interacción con la plataforma, dejando sin efecto cualquier comunicación,
              acuerdo o negociación previa, ya sea verbal o escrita.
            </p>
            <p>
              <strong className="font-semibold text-ink">14.2 Nulidad parcial.</strong> Si alguna cláusula o
              disposición de estos Términos fuera declarada nula, inválida, ilegal o inaplicable por un tribunal o
              autoridad competente, las demás cláusulas mantendrán su plena vigencia, validez y efecto. La cláusula
              afectada será interpretada, integrada o reemplazada por Universo Psi mediante una disposición que,
              siendo válida y legalmente aplicable, refleje en la mayor medida posible la intención y el espíritu
              económico-jurídico original de la norma afectada.
            </p>
            <p>
              <strong className="font-semibold text-ink">14.3 Restricciones de cesión.</strong> El Sujeto Alcanzado
              no podrá ceder, transferir ni delegar sus derechos u obligaciones bajo estos Términos sin el
              consentimiento previo y por escrito de Universo Psi. Por su parte, Universo Psi podrá ceder,
              transferir, subcontratar o delegar sus derechos y obligaciones contractuales a cualquier tercero o
              sociedad vinculada en cualquier momento, asumiendo el compromiso de notificar a los Sujetos
              Alcanzados con una razonable antelación a través de la plataforma.
            </p>
            <p>
              <strong className="font-semibold text-ink">14.4 Tolerancia y no renuncia.</strong> El hecho de que
              Universo Psi no ejerza, demore en ejercer o exija de forma laxa cualquier derecho, facultad o acción
              legal prevista en estos Términos y Condiciones no constituirá en ningún caso una renuncia a dicho
              derecho, ni impedirá su ejercicio estricto en el futuro ante incumplimientos idénticos o sucesivos.
            </p>
            <p>
              <strong className="font-semibold text-ink">14.5 Canales de contacto y notificaciones.</strong> Para
              cualquier consulta legal, ejercicio de derechos de acceso, rectificación o supresión de datos,
              sugerencias o reclamos operativos, los Sujetos Alcanzados podrán contactar de forma directa a la
              administración de Universo Psi a través de los siguientes canales oficiales habilitados:
            </p>
            <ul className={listClassName}>
              <li>
                Titular: {LEGAL_ENTITY.name}, CUIT {LEGAL_ENTITY.taxId}.
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
                <Link className="font-semibold text-ink underline underline-offset-4" href="/contacto">
                  Formulario de contacto
                </Link>
                : disponible de forma permanente en la plataforma.
              </li>
            </ul>
            <p>
              <strong className="font-semibold text-ink">14.6 Órgano de control de datos personales.</strong> En
              cumplimiento de las normativas de transparencia, se informa que los Sujetos Alcanzados podrán dirigir
              sus consultas, reclamos o denuncias relativas a la protección, vulneración o tratamiento indebido de
              sus datos personales ante la Agencia de Acceso a la Información Pública (AAIP), en su carácter de
              Órgano de Control de la Ley N° 25.326, a través de su sitio web oficial:{" "}
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

          <p className="rounded-2xl border border-senda/25 bg-senda/5 px-5 py-4 text-sm leading-6 text-ink">
            Al utilizar Universo Psi, Usted reconoce de forma expresa haber leído, comprendido en su totalidad y
            aceptado sin reservas los presentes Términos y Condiciones de Uso, comprometiéndose a su estricto
            cumplimiento.
          </p>
        </div>
      </Container>
    </section>
  );
}
