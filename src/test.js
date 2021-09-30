// *****************************************************************************
// EXPRESS WEBSERVER IMPORT
// MAIN/DEFAULT WEB SERVER PARAMETERS
import express from "express";
const app = express();
const PORT = 3333;    // Sets default website port
app.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:${PORT}`);
});
const WEB = "web";
app.use(express.static(WEB, {    // Like "Default Document" on ISS
  index: ["index.html"]
}));

// ADDITIONAL WEB SERVER PARAMETERS 
// Suteikia funkcionaluma automatiskai iskaidyti URL'e esancius parametrus
// i atskirus objektus. Visu ju vertes tekstines, todel skaitines reiksmes reikia
// konvertuotis i skaicius.
app.use(express.urlencoded({
  extended: true,
}));
// *****************************************************************************
// HANDLEBARS FOR EXPRESS WEB SERVER IMPORT 
import handleBars from "express-handlebars";
// app.engine('handlebars', handleBars()); // DEFAULT
app.engine(
  "handlebars",
  handleBars({
    helpers: {
      dateFormat: (date) => {
        if (date instanceof Date) {
          let year = "0000" + date.getFullYear();
          year = year.substr(-4);
          let month = "00" + (date.getMonth() + 1);
          month = month.substr(-2);
          let day = "00" + date.getDate();
          day = day.substr(-2);
          return `${year}-${month}-${day}`;
        }
        return date;
      },
      eq: (param1, param2) => {
        return param1 === param2;
      },
    },
  }),
);

app.set('view engine', 'handlebars');
// *****************************************************************************
// IMPORT MYSQL 
import { connect, end, query } from "./db.js";
// *****************************************************************************


// VISOS LENTELES SPAUSDINIMAS
app.get("/visaLentele", async (req, res) => {
    let conn;
    try {
      conn = await connect();
      const { results: visaLentele } = await query(
        conn,
        `
      select
        id, column1, column2
      from visaLentele
      order by
        column1`,
      );
      res.render("visaLentele", { visaLentele });
    } catch (err) {
      res.render("klaida", { err });
    } finally {
      await end(conn);
    }
  });

  // VIENO IRASO HTML FORMOS GENERAVIMAS
  app.get("/eilute/:id?", async (req, res) => {
    // Tikriname ar yra perduotas id parametras.
    // id yra -> senas irasas ir forma uzpildom iraso duomenimis
    // id nera -> naujas irasas, formos laukai pateikiami tusti
    if (req.params.id) {
      const id = parseInt(req.params.id);
      if (!isNaN(id)) { // pasitikrinam ar id yra skaicius ir ar koks internautas neidejo savo tekstinio id
        let conn;
        try {
          conn = await connect();
          const { results: eilute } = await query(
            conn,
            `
            select
              id, column1, column2
            from visaLentele
            where id = ?`,
            [id],
          );
          if (eilute.length > 0) {
            // pasitikrinam ar gavom norima irasa ir jei taip salia formuojam tentele
            // is susijusios lenteles irasu
            const { results: susijusiosEilutes } = await query(
              conn,
              `
              select
                susijusiLentele.sl_id,
                susijusiLentele.sl_column1,
                susijusiLentele.sl_column2
              from susijusiLentele left join visaLentele on visaLentele.id = susijusiLentele.foreign_key
              where visaLentele.id = ?
              order by susijusiLentele.sl_column1`,
              [eilute[0].id],
            );
            res.render("eilute", { eilute: eilute[0], susijusiosEilutes });
          } else {
            // Jei pagrindinis irasas nerastas permetam i visu irasu sarasa
            // o galim parodyt klaidos forma, kad pagal id irasas nerastas
            res.redirect("/visaLentele");
          }
        } catch (err) {
          // ivyko klaida gaunant duomenis
          res.render("klaida", { err });
        } finally {
          await end(conn);
        }
      } else {
        // Jei id buvo nurodytas ne skaicius permetam i visu irasu sarasa
        // o galim parodyt klaidos forma, kad id negali buti stringas
        res.redirect("/cekiai");
      }
    } else {
      // Jei id nenurodytas vadinasi tai bus
      // naujo iraso ivedimas
      res.render("cekis");
    }
  });